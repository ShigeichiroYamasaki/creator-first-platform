# Local Navidrome server

This directory contains the local-only Navidrome media server used for the first Creator First Platform streaming slice.

- Compose: `compose.yml`
- Music library: `music/` (read-only in the container)
- Application data: Docker named volume `creator-first-streaming_navidrome-data`
- Browser: <http://127.0.0.1:4533>

Start from the repository root with `npm run streaming:up`, create the first local administrator in the browser, and stop with `npm run streaming:down`. The generated `music/local-test-tone.wav` is synthetic test audio and is ignored by Git.

This setup exposes Navidrome only on the host loopback interface. It is not the production topology: a later slice will remove direct client access and place the Streaming Authorization Gateway in front of Navidrome.

Detailed Japanese instructions: [`docs/demo/local-streaming.md`](../../docs/demo/local-streaming.md)
Detailed English instructions: [`docs/en/local-streaming.md`](../../docs/en/local-streaming.md)
