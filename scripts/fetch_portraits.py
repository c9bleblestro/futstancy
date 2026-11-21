#!/usr/bin/env python3
"""Baixa somente retratos do Wikimedia Commons com licença reutilizável.

Executado no GitHub Actions; fotos são reduzidas e armazenadas no repositório.
Em produção o Worker não precisa fazer chamadas à API da Wikipédia.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
import json
import re
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "portraits"
OUT.mkdir(parents=True, exist_ok=True)
ART = (ROOT / "src" / "art.ts").read_text(encoding="utf-8")
ENCYCLOPEDIA = ART.split("const encyclopedia:", 1)[1].split("};", 1)[0]
TITLES = dict(re.findall(r"([a-z]+):\s*'([^']+)'", ENCYCLOPEDIA))
USER_AGENT = "Futstancy-portrait-sync/2.1 (https://github.com/c9bleblestro/futstancy; contact: GitHub issues)"
HEADERS = {"User-Agent": USER_AGENT, "Accept": "application/json, text/html;q=0.9, */*;q=0.5"}

def request(url, max_bytes=2_000_000):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as response:
        data = response.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError("Arquivo maior que o limite")
        return data

def api_thumbnail(title):
    qs = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "pageimages",
        "pithumbsize": "320", "titles": title,
    })
    body = request("https://en.wikipedia.org/w/api.php?" + qs)
    doc = json.loads(body)
    for page in doc.get("query", {}).get("pages", {}).values():
        source = page.get("thumbnail", {}).get("source")
        if source:
            return source
    return None

def summary_thumbnail(title):
    slug = urllib.parse.quote(title.replace(" ", "_"))
    doc = json.loads(request("https://en.wikipedia.org/api/rest_v1/page/summary/" + slug))
    return doc.get("thumbnail", {}).get("source")

class OGImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.image = None
    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            props = dict(attrs)
            if props.get("property") == "og:image":
                self.image = unescape(props.get("content", ""))

def html_thumbnail(title):
    slug = urllib.parse.quote(title.replace(" ", "_"))
    html_doc = request("https://en.wikipedia.org/wiki/" + slug, 1_800_000).decode("utf-8", "replace")
    parser = OGImageParser()
    parser.feed(html_doc)
    return parser.image

def commons_file_name(thumb):
    url = urllib.parse.urlparse(thumb)
    path = urllib.parse.unquote(url.path)
    if url.hostname not in ("upload.wikimedia.org", "thumb.wikimedia.org") or "/wikipedia/commons/" not in path:
        raise ValueError("Imagem fora Commons: " + str(url.hostname) + " " + path[:80])
    parts = path.split("/")
    return parts[-2] if "/thumb/" in path else parts[-1]

def verified_license(filename):
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "imageinfo",
        "iiprop": "extmetadata", "titles": "File:" + filename,
    })
    doc = json.loads(request("https://commons.wikimedia.org/w/api.php?" + query))
    pages = doc.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    info = (page.get("imageinfo") or [{}])[0]
    md = info.get("extmetadata") or {}
    get = lambda key: unescape(re.sub(r"<[^>]*>", "", str((md.get(key) or {}).get("value", "")))).strip()
    license_name = get("LicenseShortName")
    license_url = get("LicenseUrl")
    artist = re.sub(r"\s+", " ", get("Artist"))[:250]
    allowed = ("CC BY", "CC-BY", "CC0", "PUBLIC DOMAIN", "PD-", "PD ")
    if not any(x in license_name.upper() for x in allowed):
        raise ValueError("Licença não confirmada: " + repr(license_name))
    file_url = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_"))
    return {"file": filename, "source": file_url, "artist": artist or "ver página do arquivo",
            "license": license_name, "license_url": license_url or file_url}

# Dois artigos não oferecem thumbnail, mas seus arquivos no Commons são licenciados.
SPECIAL_FILES = {
    "bento": "Esteghlal F.C. v Al Nassr FC, 3 March 2025 (Bento Matheus Krepski).jpg",
    "bremer": "Bremer Brazil V Morocco 13 June 2026-143 (cropped).jpg",
}

def save_portrait(key, title):
    target = OUT / (key + ".jpg")
    if target.exists():
        return key, True, None
    if key in SPECIAL_FILES:
        try:
            filename = SPECIAL_FILES[key]
            attribution = verified_license(filename)
            image_url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename) + "?width=320"
            photo = request(image_url, 1_800_000)
            with Image.open(BytesIO(photo)) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im = ImageOps.fit(im, (250, 260), method=Image.Resampling.LANCZOS, centering=(0.5, 0.28))
                im.save(target, format="JPEG", optimize=True, quality=82, progressive=True)
            attribution["key"] = key
            attribution["title"] = title
            attribution["modification"] = "miniatura redimensionada e recortada para carta do Futstancy"
            return key, True, attribution
        except Exception as err:
            print(f"[SPECIAL MISS] {key}: {type(err).__name__}: {err}", flush=True)
    errors = []
    for method in (api_thumbnail, summary_thumbnail, html_thumbnail):
        try:
            thumb = method(title)
            if not thumb:
                raise ValueError("sem thumbnail")
            filename = commons_file_name(thumb)
            attribution = verified_license(filename)
            photo = request(thumb, 1_800_000)
            with Image.open(BytesIO(photo)) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                # Cartas exibem rosto e torso; crops são derivados de foto licenciada.
                im = ImageOps.fit(im, (250, 260), method=Image.Resampling.LANCZOS, centering=(0.5, 0.28))
                im.save(target, format="JPEG", optimize=True, quality=82, progressive=True)
            attribution["key"] = key
            attribution["title"] = title
            attribution["modification"] = "miniatura redimensionada e recortada para carta do Futstancy"
            return key, True, attribution
        except Exception as err:
            errors.append(type(err).__name__ + ": " + str(err)[:100])
    return key, False, " | ".join(errors)

def main():
    import sys
    if not TITLES:
        sys.exit("O catálogo de atletas não foi encontrado.")
    credit_path = ROOT / "docs" / "PHOTO_CREDITS.md"
    # Existe uma entrada por retrato. Nomes/caminhos vêm do catálogo conhecido,
    # não de parâmetros arbitrários de usuários.
    records = []
    if credit_path.exists():
        # Em reexecuções, imagens existentes têm crédito preservado.
        previous = credit_path.read_text(encoding="utf-8")
        credits = previous.split("<!-- CREDITS_JSON\n")[-1].split("\nEND_CREDITS_JSON -->")[0]
        if credits != previous:
            try:
                records = json.loads(credits)
            except ValueError:
                pass
    by_key = {row["key"]: row for row in records}
    successes, failures = [], []
    with ThreadPoolExecutor(max_workers=3) as ex:
        future_map = {ex.submit(save_portrait, key, title): key for key, title in TITLES.items()}
        for f in as_completed(future_map):
            key, ok, detail = f.result()
            if ok:
                successes.append(key)
                if isinstance(detail, dict):
                    by_key[key] = detail
                print(f"[OK] {key}", flush=True)
            else:
                failures.append((key, detail))
                print(f"[MISS] {key}: {detail}", flush=True)
    ordered = [by_key[key] for key in sorted(by_key)]
    credit_path.parent.mkdir(parents=True, exist_ok=True)
    notes = ["# Créditos e licenças dos retratos — Futstancy",
             "", "As fotografias são provenientes do Wikimedia Commons e não são artes oficiais do EA SPORTS FC/eFootball.",
             "Cada imagem foi redimensionada e recortada. Consulte a licença do arquivo original antes de redistribuir.",
             ""]
    for row in ordered:
        notes += [f"- **{row['title']}** — {row['artist']}; licença: [{row['license']}]({row['license_url']}); [arquivo original]({row['source']}). Alteração: redimensionamento/recorte."]
    notes += ["", "<!-- CREDITS_JSON", json.dumps(ordered, ensure_ascii=False, indent=2), "END_CREDITS_JSON -->", ""]
    credit_path.write_text("\n".join(notes), encoding="utf-8")
    print(f"RESUMO: {len(successes)}/{len(TITLES)} atletas com retrato. Sem foto: {[x[0] for x in failures]}", flush=True)
    if not successes:
        sys.exit("Nenhum retrato baixado: revisar acesso ao Wikimedia no log.")

if __name__ == "__main__":
    main()
