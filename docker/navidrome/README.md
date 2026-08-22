# Local Navidrome server

This directory contains the local-only Navidrome media server used for the first Creator First Platform streaming slice.

- Compose: `compose.yml`
- Music library: `music/` (read-only in the container)
- Application data: Docker named volume `creator-first-streaming_navidrome-data`
- Browser: <http://127.0.0.1:4533>

Start from the repository root with `npm run streaming:up`, create the first local administrator in the browser, and stop with `npm run streaming:down`. The generated `music/local-test-tone.wav` is synthetic test audio and is ignored by Git.

This standalone administration setup exposes Navidrome only on the host loopback interface and is never used by the public Player. The local Gateway Mock currently uses its bounded synthetic-file adapter. Enabling the Navidrome adapter will remove the host port and place Gateway and Navidrome on a private media network.

Detailed Japanese instructions: [`docs/demo/local-streaming.md`](../../docs/demo/local-streaming.md)
Detailed English instructions: [`docs/en/local-streaming.md`](../../docs/en/local-streaming.md)
