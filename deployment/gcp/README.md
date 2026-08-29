# Google Cloud test deployment

The e2-micro test VM restores its stack from instance metadata because it is IPv6-only and is not expected to expose SSH publicly.

- `docker/navidrome/compose.gcp.yml` defines Navidrome, the public static browser demo, the authenticated bootstrap gateway and Cloudflare Quick Tunnel.
- `deployment/gcp/startup.sh` downloads a checksum-bound static site archive, preserves the Navidrome named volume, and recreates the static-serving containers after the atomic directory replacement so they cannot retain the previous bind mount.
- `/creator-first-platform/` is public static documentation and browser-only test UI.
- `/` remains the Basic-authenticated Navidrome administration surface.

The site archive URL is a deployment transport, not an application dependency. After a successful first extraction, the VM reuses the local site if the metadata URL is later unavailable. Do not place credentials, real music, rights evidence, identity records or payment information in the archive.

Participant application email may use the bounded `gmail-smtp` gateway profile with `11rou.yamasaki@gmail.com`. Its dedicated Google app password must be supplied separately from site and source archives, written to a root-readable runtime secret, and removed from transient instance metadata immediately after provisioning. The normal Google password must never be used. If the runtime secret is unavailable, the public application endpoint must remain unavailable rather than silently retaining mail in an operator-invisible outbox.
