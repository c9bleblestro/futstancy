import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDiscordRequest } from '../src/index.ts';

const hex = (data: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer)).map(c => c.toString(16).padStart(2, '0')).join('');

test('interações aceitas apenas com assinatura válida de Ed25519', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await crypto.subtle.exportKey('raw', pair.publicKey);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ type: 1 });
  const sig = await crypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(timestamp + body));
  assert.equal(await verifyDiscordRequest(body, hex(sig), timestamp, hex(pub)), true);
  assert.equal(await verifyDiscordRequest(body + ' ', hex(sig), timestamp, hex(pub)), false);
  assert.equal(await verifyDiscordRequest(body, '00', timestamp, hex(pub)), false);
  assert.equal(await verifyDiscordRequest(body, hex(sig), String(Number(timestamp) - 600), hex(pub)), false);
  assert.equal(await verifyDiscordRequest(body, null, timestamp, hex(pub)), false);
});
