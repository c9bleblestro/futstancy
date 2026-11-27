# GAMESTANCY LIVE — Discord Activity beta

This release builds the official Embedded App SDK into a browser bundle and serves a dedicated Activity at the Discord iframe root. It shows the real Activity participants and updates on joins/leaves, and lists community clip links. Live screen sharing, live ingest and playback are paused in this release. On 18 November 2026 the ANPD maintained the suspension of Go Live and equivalent one-to-many video features in Brazil. Do not use this project to evade that restriction. The earlier media-server deployment instructions are superseded.

## Required configuration
1. Deploy the existing Worker after applying D1 migration 0004 (npm run deploy). The Wrangler build runs npm run build:activity and generates the SDK bundle locally. Set the correct DISCORD_APPLICATION_ID (public ID) and keep the existing bot token secret.
2. In the Discord Developer Portal select the actual GAMESTANCY application, then Activities > URL Mappings. Map / to the actual Worker hostname (no protocol or path). Enable Activities and configure desired installation contexts. Do not change the interaction endpoint.
3. Configure the application for voice-call Activity testing. Unverified Activities are restricted to app developers and approved testers. Set LIVE_ACTIVITY_ENABLED=1 on the Worker after enabling the Activity in the portal; run /sincronizar or allow the existing versioned registration process. This registers the native Launch entry point without removing football commands.
4. Enter a voice call, open App Launcher / Activities, select GAMESTANCY, then have another approved tester join. Verify the participant list changes, clip links open safely, and the mobile layout fits. The actual client behavior must be tested; no deployment or Developer Portal change is performed by this repository commit.

## Routes
- /activity: browser preview without Discord RPC; no fake participants.
- / with Discord frame_id and instance_id: dedicated Activity page.
- /activity/config: public application ID only.
- /live/api/feed: clip feed, with live rooms suppressed.

The old web panel and football systems remain intact. No client secret or user OAuth scope is required for the read-only connected-participant list. No user tokens are stored. No shared live player or screen capture is active. Clips are external platform links, not synchronized playback.
