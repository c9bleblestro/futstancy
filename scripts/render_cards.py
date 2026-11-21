#!/usr/bin/env python3
"""Pre-render Futstancy premium cards from the original in-game catalog.

Source portraits and attribution: assets/portraits/, docs/PHOTO_CREDITS.md.
The six printed skill values are cosmetic and do not affect match simulation.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import random, re, math

ROOT=Path(__file__).resolve().parent.parent
DATA=(ROOT/'src/catalog.ts').read_text(encoding='utf8')
PLAYERS=re.findall(r"\{ key: '([^']+)', name: '([^']+)', pos: '([^']+)', ovr: (\d+), country: '([^']+)' \}",DATA)
OUT=ROOT/'assets/cards'
OUT.mkdir(parents=True,exist_ok=True)
FONT=next(p for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if Path(p).exists())
ft=lambda n:ImageFont.truetype(FONT,n)
W,H=700,940
PALETTE={
 'PRATA':((211,233,254),(79,117,178),(19,37,70)),
 'OURO':((255,220,118),(190,111,30),(66,35,11)),
 'DIAMANTE':((227,172,255),(126,31,220),(51,15,86)),
 'ÍCONE':((135,239,255),(28,124,240),(4,41,91)),
}
FLAGS={
 'Brasil':[(4,149,52),(248,218,17),(4,45,131)],
 'França':[(7,61,153),(255,255,255),(217,29,54)],
 'Portugal':[(5,129,69),(219,44,47),(247,207,31)],
 'Inglaterra':[(244,246,255),(204,30,49),(244,246,255)],
 'Itália':[(0,146,72),(248,248,248),(202,37,51)],
 'Espanha':[(190,37,50),(240,203,46),(190,37,50)],
 'Noruega':[(178,26,41),(243,243,243),(23,48,122)],
 'Argentina':[(105,180,237),(249,249,249),(105,180,237)],
 'Holanda':[(175,28,45),(249,249,249),(29,70,146)],
 'Alemanha':[(21,21,21),(205,26,46),(247,206,40)],
 'Bélgica':[(24,24,24),(248,214,27),(234,33,50)],
 'Egito':[(198,27,44),(253,253,253),(21,21,21)],
}
def rarity(ovr):
 return 'ÍCONE' if ovr>=90 else 'DIAMANTE' if ovr>=86 else 'OURO' if ovr>=80 else 'PRATA'
def mix(a,b,t):return tuple(round(a[j]*(1-t)+b[j]*t) for j in range(3))
def center(d,s,y,size,fill,spacing=0):
 f=ft(size)
 if not spacing:
  w=d.textlength(s,font=f);d.text(((W-w)/2,y),s,font=f,fill=fill,stroke_width=1,stroke_fill='#060b18')
 else:
  chars=[d.textlength(ch,font=f) for ch in s]
  x=(W-sum(chars)-spacing*(len(s)-1))/2
  for ch,n in zip(s,chars):d.text((x,y),ch,font=f,fill=fill);x+=n+spacing
def flag(d,c,x,y):
 d.rounded_rectangle((x-3,y-3,x+67,y+46),radius=5,fill='white')
 cols=FLAGS.get(c,[(32,84,170),(250,250,250),(32,84,170)])
 if c=='Brasil':
  d.rectangle((x,y,x+64,y+43),fill=cols[0])
  d.polygon([(x+32,y+4),(x+59,y+21),(x+32,y+39),(x+5,y+21)],fill=cols[1])
  d.ellipse((x+21,y+12,x+43,y+32),fill=cols[2])
 elif c=='Inglaterra':
  d.rectangle((x,y,x+64,y+43),fill=cols[0])
  d.rectangle((x+25,y,x+39,y+43),fill=cols[1]);d.rectangle((x,y+17,x+64,y+27),fill=cols[1])
 elif c in ('França','Portugal','Itália','Bélgica'):
  for i,color in enumerate(cols):d.rectangle((x+64*i//3,y,x+64*(i+1)//3,y+43),fill=color)
 else:
  for i,color in enumerate(cols):d.rectangle((x,y+43*i//3,x+64,y+43*(i+1)//3),fill=color)
def render(key,name,pos,ovr,country):
 ovr=int(ovr);rare=rarity(ovr);shiny,deep,shade=PALETTE[rare]
 rnd=random.Random('futstancy:'+key)
 im=Image.new('RGB',(W,H));d=ImageDraw.Draw(im)
 for y in range(H):d.line((0,y,W,y),fill=mix((6,10,30),(14,25,59),y/H*.72))
 halo=Image.new('RGBA',(W,H));hd=ImageDraw.Draw(halo);hd.ellipse((120,55,740,800),fill=(*shiny,94))
 im=Image.alpha_composite(im.convert('RGBA'),halo.filter(ImageFilter.GaussianBlur(110)))
 d=ImageDraw.Draw(im,'RGBA')
 for i in range(30):
  x=rnd.randint(40,660);y=rnd.randint(95,730)
  d.polygon([(x,y),(x+rnd.randint(-95,155),y-rnd.randint(50,140)),(x+rnd.randint(-70,170),y+rnd.randint(80,190))],fill=(*shiny,rnd.randint(8,45)))
 for i in range(14):
  x=rnd.randint(20,680);y=rnd.randint(100,720)
  d.line((x,y,x+rnd.randint(40,190),y-rnd.randint(60,150)),fill=(*shiny,rnd.randint(20,80)),width=rnd.randint(2,5))
 photo=ROOT/'assets/portraits'/f'{key}.jpg'
 if not photo.exists():raise FileNotFoundError(photo)
 with Image.open(photo) as p:
  p=ImageOps.exif_transpose(p).convert('RGBA')
  p=ImageOps.fit(p,(495,580),Image.Resampling.LANCZOS,centering=(.5,.33))
  # Alpha fade on picture edges + lower third. Keep nameplate perfectly legible.
  mask=Image.new('L',p.size);m=ImageDraw.Draw(mask)
  for yy in range(580):
   a=255 if yy<370 else max(0,int(255*(555-yy)/185))
   m.line((0,yy,495,yy),fill=max(0,a))
  mask=ImageChops.multiply(mask,Image.new('L',p.size,255)) if False else mask
  im.paste(p,(170,165),mask)
 d=ImageDraw.Draw(im,'RGBA')
 outer=[(350,12),(430,55),(510,42),(644,129),(636,706),(569,817),(350,927),(131,817),(64,706),(56,129),(190,42),(270,55)]
 glow=Image.new('RGBA',(W,H));gd=ImageDraw.Draw(glow)
 for width,alpha in [(40,52),(27,76),(16,120)]:
  gd.line(outer+[outer[0]],fill=(*shiny,alpha),width=width,joint='curve')
 im=Image.alpha_composite(im,glow.filter(ImageFilter.GaussianBlur(13)))
 d=ImageDraw.Draw(im,'RGBA')
 d.line(outer+[outer[0]],fill=(*deep,255),width=26,joint='curve')
 d.line(outer+[outer[0]],fill=(*shiny,255),width=17,joint='curve')
 inner=[(350,43),(430,84),(501,70),(611,150),(601,691),(547,794),(350,888),(153,794),(99,691),(89,150),(200,70),(270,84)]
 d.line(inner+[inner[0]],fill=(252,250,250,200),width=4,joint='curve')
 for x,dx in [(72,-1),(628,1)]:
  d.polygon([(x-10*dx,217),(x+11*dx,277),(x+11*dx,545),(x-16*dx,583)],fill=(*deep,225))
  d.line([(x-10*dx,217),(x+11*dx,277),(x+11*dx,545),(x-16*dx,583)],fill=(*shiny,255),width=5)
 center(d,'♛  F U T S T A N C Y  ♛',90,27,(241,242,250))
 d.rounded_rectangle((112,205,267,407),radius=12,fill=(4,9,26,238),outline=(*shiny,240),width=2)
 d.text((128,216),str(ovr),font=ft(99),fill=(252,252,255),stroke_width=2,stroke_fill='#050717')
 d.text((139,329),pos,font=ft(48),fill=shiny)
 flag(d,country,149,427)
 d.rounded_rectangle((98,641,602,787),radius=17,fill=(4,8,24,251),outline=(*shiny,255),width=5)
 label=name.upper()
 sz=49 if len(label)<13 else 39 if len(label)<17 else 31
 while d.textlength(label,font=ft(sz))>470:sz-=2
 center(d,label,657,sz,(255,255,255))
 d.rounded_rectangle((218,730,482,789),radius=13,fill=(*shade,255),outline=(*shiny,255),width=4)
 center(d,rare,741,34,shiny)
 # Skill values are decorative, derived from the stable card key and OVR.
 labels=('REF','DIV','CHU','POS','PAS','FÍS') if pos=='GOL' else ('RIT','FIN','PAS','CON','DEF','FÍS')
 offsets={'GOL':[-3,2,-8,2,-6,3],'ZAG':[-4,-11,-5,-4,5,3],'MEI':[2,-2,4,3,-5,-2],'ATA':[6,5,-3,6,-10,-3]}[pos]
 r=random.Random('skills-'+key)
 skills=[max(30,min(99,ovr+off+r.randrange(-5,6))) for off in offsets]
 d.rounded_rectangle((125,797,580,882),radius=9,fill=(5,10,28,242))
 for i,(lab,val) in enumerate(zip(labels,skills)):
  x=139+i*76
  d.text((x,807),lab,font=ft(22),fill=(194,211,235))
  d.text((x,839),str(val),font=ft(29),fill=(254,254,255))
 d.polygon([(350,892),(375,916),(350,939),(325,916)],fill=(*shiny,255))
 d.line([(350,892),(375,916),(350,939),(325,916),(350,892)],fill='white',width=3)
 dest=OUT/f'{key}.jpg'
 im.convert('RGB').save(dest,format='JPEG',quality=88,subsampling=0,optimize=True,progressive=True)
 print(f'[CARD] {key}: {dest.stat().st_size//1024} KiB',flush=True)


def render_banner(kind,title,subtitle,col):
    outdir=ROOT/'assets/ui';outdir.mkdir(parents=True,exist_ok=True)
    w,h=1180,460
    image=Image.new('RGB',(w,h));d=ImageDraw.Draw(image)
    for y in range(h):d.line((0,y,w,y),fill=mix((5,10,29),mix((15,26,58),col,.28),y/h))
    halo=Image.new('RGBA',(w,h));hd=ImageDraw.Draw(halo)
    hd.ellipse((550,-250,1390,650),fill=(*col,110))
    image=Image.alpha_composite(image.convert('RGBA'),halo.filter(ImageFilter.GaussianBlur(120)))
    d=ImageDraw.Draw(image,'RGBA')
    rnd=random.Random(kind)
    for i in range(17):
        x=rnd.randint(580,1175);y=rnd.randint(20,400)
        d.polygon([(x,y),(x+rnd.randint(-80,150),y-140),(x+rnd.randint(-90,180),y+160)],fill=(*col,rnd.randint(12,53)))
    d.rounded_rectangle((28,26,w-28,h-27),radius=30,outline=(*col,228),width=3)
    for k in range(5):
        d.line((45,340+k*10,1135,340+k*10),fill=(*col,max(5,60-k*10)),width=2)
    d.rounded_rectangle((66,64,327,117),radius=14,fill=(6,14,34,240),outline=(*col,220),width=2)
    d.text((88,75),'♛  FUTSTANCY',font=ft(26),fill=(240,249,255))
    d.text((80,172),title[:34],font=ft(48 if len(title)<23 else 36),fill=(255,255,255))
    d.text((84,257),subtitle[:58],font=ft(23),fill=(195,223,246))
    d.text((87,380),'COLECIONE  •  JOGUE  •  CONQUISTE',font=ft(21),fill=(*col,255))
    # Abstract diamond mark: original Futstancy game motif.
    cx=950;cy=204
    d.polygon([(cx,74),(cx+116,cy),(cx,340),(cx-116,cy)],fill=(*col,80),outline=(*col,245),width=5)
    d.polygon([(cx,126),(cx+72,cy),(cx,285),(cx-72,cy)],fill=(6,14,35,220),outline=(255,255,255,210),width=3)
    dest=outdir/f'{kind}.jpg'
    image.convert('RGB').save(dest,'JPEG',quality=86,optimize=True,progressive=True)

def render_banners():
    definitions={
        'default':('FUTSTANCY','Seu clube. Sua história.',(80,182,255)),
        'ajuda':('GUIA DO TREINADOR','Descubra todos os sistemas do Futstancy.',(95,214,255)),
        'inicio':('CLUBE CRIADO!','Sua carreira de futebol começa agora.',(85,223,180)),
        'perfil':('PERFIL DO TREINADOR','Sua jornada, conquistas e estatísticas.',(92,161,255)),
        'ranking':('RANKING GLOBAL','Os treinadores mais fortes da temporada.',(255,198,93)),
        'daily':('RECOMPENSA DIÁRIA','Ganhe coins e evolua seu elenco.',(255,201,90)),
        'sucesso':('JOGADA CONCLUÍDA','Continue crescendo dentro do Futstancy.',(86,224,160)),
        'erro':('TENTE NOVAMENTE','Confira as informações e continue jogando.',(255,133,160)),
        'cooldown':('AGUARDE UM POUCO','Sua próxima recompensa está chegando.',(154,141,255)),
        'mercado':('MERCADO DE TRANSFERÊNCIAS','Compre, venda e descubra novos craques.',(97,205,250)),
        'desafio':('DESAFIO LANÇADO','O estádio espera por mais uma partida.',(222,149,255)),
        'pacote':('PACOTE DE JOGADORES','Três novos reforços para a sua coleção.',(255,199,91)),
        'time':('SEU TIME TITULAR','Onze jogadores, um único objetivo.',(76,232,190)),
    }
    for key,(title,sub,col) in definitions.items():render_banner(key,title,sub,col)
    print(f'[BANNER] {len(definitions)} painéis publicados',flush=True)

if __name__=='__main__':
 if not PLAYERS:raise SystemExit('Catálogo não reconhecido')
 for player in PLAYERS:
  # Artes aprovadas pelo usuario sao finais: nao re-renderizar em CI.
  if player[0] in ('bento','bremer','endrick') and (OUT/(player[0]+'.jpg')).exists():
   print('[APPROVED] Mantida carta original de '+player[0],flush=True)
   continue
  render(*player)
 render_banners()
 print(f'[CARD] {len(PLAYERS)} cartas geradas',flush=True)
