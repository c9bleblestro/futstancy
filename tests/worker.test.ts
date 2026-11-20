import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(n => n.toString(16).padStart(2, '0')).join('');

test('worker responde ao status público sem credenciais', async () => {
  const response = await worker.fetch(new Request('https://futstancy.example/health'), {} as never, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { worker: string }).worker, 'online');
  const landing = await worker.fetch(new Request('https://futstancy.example/'), {} as never, { waitUntil() {} });
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /FUTSTANCY/);
});

test('rejeita requisição não autenticada e responde PING assinado', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const key = hex(await crypto.subtle.exportKey('raw', pair.publicKey));
  const raw = JSON.stringify({ type: 1, id: 'fake-ping', application_id: '0' });
  const time = String(Math.floor(Date.now() / 1000));
  const sig = hex(await crypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(time + raw)));
  const env = { DISCORD_PUBLIC_KEY: key } as never;
  const ctx = { waitUntil(p: Promise<unknown>) { void p.catch(() => {}); } };
  const invalid = await worker.fetch(new Request('https://example.com/interactions', { method: 'POST', body: raw }), env, ctx);
  assert.equal(invalid.status, 401);
  const good = await worker.fetch(new Request('https://example.com/interactions', { method: 'POST', body: raw, headers: {
    'x-signature-ed25519': sig,
    'x-signature-timestamp': time,
  } }), env, ctx);
  assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), { type: 1 });
});
