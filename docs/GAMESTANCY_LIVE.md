# GAMESTANCY LIVE — beta
This adds a separate public live directory and curated external clip links to the existing futstancy Worker. No football records, prefix or existing art are replaced.

## Worker
Apply migration 0004 using the existing npm run deploy workflow. Set LIVE_PANEL_URL to the HTTPS Worker /live URL; LIVE_HLS_ORIGIN to the trusted HTTPS media origin (no trailing path required); LIVE_INGEST_URL to the RTMPS server base (no stream path); leave LIVE_ACTIVITY_ENABLED unset initially. Do not put credentials in these environment values. No actual media server is provisioned by this commit.

## Media server
Deploy MediaMTX on an external VPS with a trusted TLS certificate and reverse proxy. See media/mediamtx.yml.example. Replace the callback host, mount certificates, expose RTMPS 1936 and HTTPS HLS through the reverse proxy. Keep HLS port private; do not expose control API. Apply IP/rate limits and bandwidth quotas at the host. Use a public domain with valid TLS, not HTTP. Set up an admin process to stop abusive streams and revoke access. No recordings. Set OBS H264/AAC, 720p30, 2500 kbps, keyframe 2s. For compatible mobile RTMPS encoders use the same private URL; native screen capture APK is not included. Stop the encoder when ending a room: the worker revokes playback and future authentication but does not terminate an already connected publisher on the media server. The four-hour expiration and five-room limit apply to directory/authorization, not a hard bandwidth cap.

## Commands
- /fut live (or Slive) shows the public panel.
- /fut live acao:iniciar titulo:... creates a public four-hour room and sends a private RTMPS URL. Never paste this URL in a channel.
- /fut live acao:encerrar removes own room.
- /fut live acao:clipe titulo:... url:... publishes a YouTube or Twitch Clips link. Use content you have rights to share.
- /fut live acao:remover url:CODE removes own clip.
- /fut live acao:abrir launches the Activity only when explicitly enabled.

## Discord Activity
The web viewer uses same-origin resources and HLS rather than WebRTC. In Discord Developer Portal enable Activities, configure URL Mapping / to the Worker hostname, and configure both installation contexts if desired. The Worker serves the LIVE page on root when Discord supplies frame_id and instance_id. Test embedded playback, CSP, proxy behavior and mobile before setting LIVE_ACTIVITY_ENABLED=1 and running /sincronizar. That flag includes the primary entry-point command in bulk registration, preserving it. The browser beta does not yet include Embedded App SDK authentication/handshake; integration may need a bundled SDK client before Discord can launch it reliably. Do not enable publicly until these checks pass.
## Scope
Public discovery, real HLS playback when configured, per-user private ingest credentials, and external clip sharing only. Private rooms, native Android/iOS screen capture, chat, follows, uploads, TV scheduling and moderation UI remain future work. No fake viewer count or online badge: the player confirms when video actually plays.
