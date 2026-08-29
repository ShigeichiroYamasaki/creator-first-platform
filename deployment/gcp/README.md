# Google Cloud test deployment

The e2-micro test VM restores its stack from instance metadata because it is IPv6-only and is not expected to expose SSH publicly.

- `docker/navidrome/compose.gcp.yml` defines Navidrome, the public static browser demo, the participant API gateway, the authenticated bootstrap gateway and Cloudflare Quick Tunnel.
- `deployment/gcp/startup.sh` downloads a checksum-bound static-site archive and a prebuilt Linux/AMD64 gateway image, preserves the Navidrome and gateway data volumes, and recreates the static-serving containers after the atomic directory replacement so they cannot retain the previous bind mount. The small VM does not run `npm ci` during boot.
- `/creator-first-platform/` is public static documentation and browser-only test UI.
- `/api/` is the public same-origin participant API. Participant email is sent through the configured Gmail account; administrator routes still require the separate gateway administrator token.
- `/` remains the Basic-authenticated Navidrome administration surface.

The site archive URL is a deployment transport, not an application dependency. After a successful first extraction, the VM reuses the local site if the metadata URL is later unavailable. Do not place credentials, real music, rights evidence, identity records or payment information in the archive.

Participant application email may use the bounded `gmail-smtp` gateway profile with `11rou.yamasaki@gmail.com`. Its dedicated Google app password must be supplied separately from site and source archives, written to a root-readable runtime secret, and removed from transient instance metadata immediately after provisioning. The normal Google password must never be used. If the runtime secret is unavailable, the public application endpoint must remain unavailable rather than silently retaining mail in an operator-invisible outbox.

The gateway reads `GATEWAY_GMAIL_APP_PASSWORD_FILE` and `GATEWAY_ADMIN_TOKEN_FILE` from `/run/secrets`. Neither secret belongs in `gateway.env`, Git, the static bundle, the source archive or deployment logs. The Quick Tunnel URI is discovered first and then written into the non-secret gateway configuration before the gateway is recreated.

The test operator administrator token is generated on the operator Mac, stored in macOS Keychain under service `creator-first-platform-gateway-admin` and account `creator-first-navidrome-demo`, and supplied to the startup script through the transient `gateway-admin-token` metadata key. The startup script accepts only a 256-bit lowercase hexadecimal token and writes it to `/run/secrets`; deployment must delete the metadata key immediately after the healthy startup marker. `deployment/gcp/copy-admin-token.sh` copies the Keychain value to the clipboard for 90 seconds without printing it. This is a test-only operator workflow, not the production administrator authentication design.

Because the VM is IPv6-only while the private Docker bridge is IPv4-only, a host `socat` unit accepts only `172.31.0.1:1465` and forwards it to Gmail implicit TLS on IPv6 port 465. TLS remains end-to-end between the Node gateway and `smtp.gmail.com`; the relay receives no Gmail credential and is not bound to a public address.
