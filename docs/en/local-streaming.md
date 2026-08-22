---
title: Local music streaming
description: Start the Creator First Platform local Navidrome music server with Docker Compose.
---

# Local music streaming

The first implementation slice runs Navidrome `0.63.2` locally with Docker Compose. It independently validates library scanning, administration, search, and playback. The Streaming Gateway Mock is implemented separately, but this administration Compose does not connect it or grant Navidrome authority over subscriptions, rights, wallets, or smart contracts.

::: warning Local development only
Navidrome binds only to `127.0.0.1`. Do not load unreleased real music, personal data, production credentials, or funds. Do not expose this server to a LAN, the Internet, or a tunnel.
:::

## Requirements

- Docker Desktop or Docker Engine
- Docker Compose v2 or later
- Node.js 24 and npm
- Host port `4533`

## Start and verify

Run from the repository root:

```sh
npm run streaming:up
npm run streaming:verify
```

The start command generates a copyright-safe five-second 440 Hz test tone at `docker/navidrome/music/local-test-tone.wav`, validates the Compose configuration, and starts Navidrome.

Open `http://127.0.0.1:4533` in a browser, create the first local administrator, and wait for the initial scan. Do not store the password in the repository. The `local-test-tone` track can then be played in the browser.

Only add audio whose reproduction and test use rights you have verified to `docker/navidrome/music/`. The directory is mounted read-only and its generated or local audio files are ignored by Git.

## Commands

| Operation | Command |
| --- | --- |
| Validate Compose | `npm run streaming:config` |
| Start | `npm run streaming:up` |
| Verify HTTP | `npm run streaming:verify` |
| Show status | `npm run streaming:ps` |
| Follow logs | `npm run streaming:logs` |
| Stop | `npm run streaming:down` |

Stopping does not delete the named volume that contains the local database and settings.

## Boundary

The host port is loopback-only, the music mount is read-only, and the Navidrome process is non-root. A network-isolated one-shot init service only fixes named-volume ownership before Navidrome starts. The local slice uses an explicit bridge network; the Navidrome-adapter deployment will replace the host port with an internal media network. Linux capabilities are dropped from Navidrome, and sharing, downloads, external services, and anonymous insights are disabled. The image uses the fixed `deluan/navidrome:0.63.2` tag.

This is not the final [ADR-0009](/adr/ADR-0009-navidrome-streaming-gateway) topology. The local Gateway Mock currently uses its bounded synthetic-file adapter. Enabling the Navidrome adapter will remove the host port and place Gateway and Navidrome on a private media network.

Japanese instructions: [ローカル音楽ストリーミング](/demo/local-streaming)
