import { COMMANDS, COMMAND_VERSION } from './commands.ts';
import { handleInteraction } from './handler.ts';
import { renderArt } from './art.ts';
import { jsonResponse } from './ui.ts';
import type { Env, Interaction } from './types.ts';

const encoder = new TextEncoder();
function toCryptoBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function decodeHex(input: string, expectedBytes: number): Uint8Array | null {
  if (input.length !== expectedBytes * 2 || !/^[0-9a-f]+$/i.test(input)) return null;
  return Uint8Array.from(input.match(/.{2}/g) ?? [], c => Number.parseInt(c, 16));
}

/** Rejeita assinaturas falsas e requisições antigas; utiliza o corpo bruto recebido. */
export async function verifyDiscordRequest(body: string, signature: string | null, timestamp: string | null, publicHex: string): Promise<boolean> {
  if (!signature || !timestamp || !/^\d{10,13}$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const pubBytes = decodeHex(publicHex, 32);
  const sigBytes = decodeHex(signature, 64);
  if (!pubBytes || !sigBytes) return false;
  try {
    const key = await crypto.subtle.importKey('raw', toCryptoBuffer(pubBytes), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, toCryptoBuffer(sigBytes), toCryptoBuffer(encoder.encode(timestamp + body)));
  } catch {
    return false;
  }
}

async function ensureCommands(env: Env): Promise<void> {
  if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_BOT_TOKEN) {
    console.log('[REGISTER] Configurar DISCORD_APPLICATION_ID e DISCORD_BOT_TOKEN na Cloudflare.');
    return;
  }
  try {
    const version = await env.DB.prepare("SELECT value FROM bot_settings WHERE key='commands_version'").first<{ value: string }>();
    if (version?.value === COMMAND_VERSION) return;
    const response = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/commands`, {
      method: 'PUT',
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(COMMANDS),
    });
    if (!response.ok) throw new Error(`Discord HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    await env.DB.prepare("INSERT INTO bot_settings(key,value) VALUES('commands_version', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(COMMAND_VERSION).run();
    console.log('[REGISTER] Slash commands publicados com sucesso.');
  } catch (err) {
    console.error('[REGISTER] Erro ao registrar comandos:', err instanceof Error ? err.message : String(err));
  }
}

interface WorkerCtx { waitUntil(task: Promise<unknown>): void; }
const landing = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Futstancy — Futebol no Discord</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:radial-gradient(ellipse at top,#2b1959,#0a0a12 65%);color:#f8f7ff;min-height:100vh;display:grid;place-items:center;padding:20px}.wrap{max-width:580px;padding:42px 30px;text-align:center;border:1px solid #5d4788;border-radius:24px;background:#181326b5;box-shadow:0 20px 70px #0007}h1{font-size:clamp(40px,7vw,72px);margin:12px 0;color:#d9b6ff}p{line-height:1.6;color:#c6bfd5}.tag{color:#91ffd0;font-weight:700;letter-spacing:2px}.features{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:25px 0}.features span{border:1px solid #5e4b88;border-radius:50px;padding:9px 13px;color:#eee5ff;font-size:14px}a{color:#d4aeff;text-decoration:none}</style></head><body><main class="wrap"><div class="tag">⚽ O CAMPO É SEU</div><h1>FUTSTANCY</h1><p>Crie seu clube, contrate craques, monte seu 4-3-3 e dispute partidas com seus amigos. Tudo dentro do Discord.</p><div class="features"><span>🎁 Cartas</span><span>⚔️ PvP</span><span>🛒 Mercado</span><span>🏆 Ranking</span></div><p>Use <strong>/s iniciar</strong> no Discord para começar.</p><small>Bot em Cloudflare Workers · <a href="/health">Status da API</a></small></main></body></html>`;

export default {
  async fetch(request: Request, env: Env, ctx: WorkerCtx): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/art/status') {
      return jsonResponse({ status: 'ready', version: '5.0.0', routes: ['player.png', 'collection.png', 'market.png', 'team.png', 'pack.png', 'score.png', 'banner.png'] });
    }
    if (request.method === 'GET' && url.pathname.startsWith('/art/')) {
      const artwork = await renderArt(request);
      if (artwork) return artwork;
      return new Response('Art route not found', {status: 404});
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(landing, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ name: 'Futstancy', worker: 'online', version: '5.0.0', interactionEndpoint: '/interactions' });
    }
    if (request.method !== 'POST' || url.pathname !== '/interactions') {
      return new Response('Not Found', { status: 404 });
    }
    if (Number(request.headers.get('content-length') ?? 0) > 256000) return new Response('Too large', { status: 413 });
    const rawBody = await request.text();
    if (rawBody.length > 256000) return new Response('Too large', { status: 413 });
    if (!await verifyDiscordRequest(rawBody, request.headers.get('x-signature-ed25519'), request.headers.get('x-signature-timestamp'), env.DISCORD_PUBLIC_KEY ?? '')) {
      return new Response('Invalid signature', { status: 401 });
    }
    let interaction: Interaction;
    try { interaction = JSON.parse(rawBody) as Interaction; }
    catch { return new Response('Invalid JSON', { status: 400 }); }
    if (interaction.type === 1) {
      // Discord chama PING na validação do endpoint. Cadastro automático se já houver secrets.
      ctx.waitUntil(ensureCommands(env));
      return jsonResponse({ type: 1 });
    }
    try {
      return jsonResponse(await handleInteraction(interaction, env));
    } catch (err) {
      console.error('[INTERACTION]', err instanceof Error ? err.message : String(err));
      return jsonResponse({ type: 4, data: { flags: 64 | 32768, components: [{ type: 10, content: '⚠️ Ocorreu um erro temporário. Tente novamente. Se persistir, avise a administração.' }], allowed_mentions: { parse: [] } } });
    }
  },
  async scheduled(_event: unknown, env: Env, ctx: WorkerCtx): Promise<void> {
    // Executa em serverless e só registra novamente quando a versão muda.
    ctx.waitUntil(ensureCommands(env));
  },
};
