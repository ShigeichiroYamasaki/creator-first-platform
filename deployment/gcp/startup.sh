#!/usr/bin/env bash
set -Eeuo pipefail

exec > >(tee -a /var/log/creator-first-startup.log) 2>&1

readonly APP_DIR=/opt/creator-first-streaming
readonly METADATA_URL=http://metadata.google.internal/computeMetadata/v1/instance/attributes
readonly METADATA_HEADER='Metadata-Flavor: Google'
readonly SITE_ARCHIVE=/var/tmp/creator-first-demo-site.tar.gz
readonly GATEWAY_IMAGE_ARCHIVE=/var/tmp/creator-first-gateway-image.tar.gz

metadata_value() {
  curl -fsS -H "${METADATA_HEADER}" "${METADATA_URL}/$1"
}

echo "CREATOR_FIRST_DEPLOY_STATUS=starting"

export DEBIAN_FRONTEND=noninteractive

for source_file in /etc/apt/sources.list.d/google*.list; do
  if [[ -e "${source_file}" ]]; then
    mv "${source_file}" "${source_file}.disabled"
  fi
done

if ! command -v docker >/dev/null || ! command -v docker-compose >/dev/null || ! command -v ffmpeg >/dev/null || ! command -v socat >/dev/null; then
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl docker.io docker-compose ffmpeg openssl socat
fi
systemctl enable --now docker

install -d -m 0750 "${APP_DIR}/bootstrap" "${APP_DIR}/music" "${APP_DIR}/secrets"
chmod 0755 "${APP_DIR}/music"
metadata_value navidrome-compose > "${APP_DIR}/compose.yml"

gateway_image_url="$(metadata_value gateway-image-url || true)"
gateway_image_sha256="$(metadata_value gateway-image-sha256 || true)"
if [[ -n "${gateway_image_url}" && -n "${gateway_image_sha256}" ]]; then
  curl --fail --location --proto '=https' --tlsv1.2 "${gateway_image_url}" -o "${GATEWAY_IMAGE_ARCHIVE}"
  printf '%s  %s\n' "${gateway_image_sha256}" "${GATEWAY_IMAGE_ARCHIVE}" | sha256sum --check --status
  gzip -dc "${GATEWAY_IMAGE_ARCHIVE}" | docker image load
  rm -f -- "${GATEWAY_IMAGE_ARCHIVE}"
elif ! docker image inspect creator-first-gateway:deployment >/dev/null 2>&1; then
  echo "CREATOR_FIRST_DEPLOY_STATUS=failed_missing_gateway_image"
  exit 1
fi
docker image inspect creator-first-gateway:deployment >/dev/null

gmail_app_password="$(metadata_value gateway-gmail-app-password || true)"
if [[ -n "${gmail_app_password}" ]]; then
  umask 077
  printf '%s' "${gmail_app_password}" > "${APP_DIR}/secrets/gmail-app-password"
fi
if [[ ! -s "${APP_DIR}/secrets/gmail-app-password" ]]; then
  echo "CREATOR_FIRST_DEPLOY_STATUS=failed_missing_gmail_secret"
  exit 1
fi
admin_token="$(metadata_value gateway-admin-token || true)"
if [[ -n "${admin_token}" ]]; then
  if [[ ! "${admin_token}" =~ ^[0-9a-f]{64}$ ]]; then
    echo "CREATOR_FIRST_DEPLOY_STATUS=failed_invalid_admin_token"
    exit 1
  fi
  umask 077
  printf '%s' "${admin_token}" > "${APP_DIR}/secrets/admin-token"
elif [[ ! -s "${APP_DIR}/secrets/admin-token" ]]; then
  umask 077
  openssl rand -hex 32 > "${APP_DIR}/secrets/admin-token"
fi
chown 1000:1000 "${APP_DIR}/secrets"
chown 1000:1000 "${APP_DIR}/secrets/gmail-app-password" "${APP_DIR}/secrets/admin-token"
chmod 0400 "${APP_DIR}/secrets/gmail-app-password" "${APP_DIR}/secrets/admin-token"

cat > "${APP_DIR}/bootstrap/gateway.env" <<'ENV'
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8787
GATEWAY_BASE_PATH=/api
GATEWAY_RUNTIME_MODE=public-experiment
GATEWAY_ALLOWED_ORIGIN=http://127.0.0.1:8080
GATEWAY_PUBLIC_URI=http://127.0.0.1:8080
GATEWAY_SIWE_DOMAIN=127.0.0.1:8080
GATEWAY_WEBAUTHN_ORIGIN=http://127.0.0.1:8080
GATEWAY_WEBAUTHN_RP_ID=127.0.0.1
GATEWAY_MAIL_MODE=gmail-smtp
GATEWAY_GMAIL_ADDRESS=11rou.yamasaki@gmail.com
GATEWAY_GMAIL_NETWORK_FAMILY=4
GATEWAY_GMAIL_CONNECT_HOST=172.31.0.1
GATEWAY_GMAIL_IMPLICIT_TLS_PORT=1465
GATEWAY_GMAIL_APP_PASSWORD_FILE=/run/secrets/gmail-app-password
GATEWAY_ADMIN_TOKEN_FILE=/run/secrets/admin-token
GATEWAY_DATABASE_PATH=/data/gateway.sqlite
GATEWAY_MEDIA_ADAPTER=file
GATEWAY_MEDIA_ROOT=/music
GATEWAY_CHAIN_ID=80002
ENV
chmod 0640 "${APP_DIR}/bootstrap/gateway.env"

site_url="$(metadata_value demo-site-url || true)"
site_sha256="$(metadata_value demo-site-sha256 || true)"
if [[ -n "${site_url}" && -n "${site_sha256}" ]]; then
  curl --fail --location --proto '=https' --tlsv1.2 "${site_url}" -o "${SITE_ARCHIVE}"
  printf '%s  %s\n' "${site_sha256}" "${SITE_ARCHIVE}" | sha256sum --check --status

  rm -rf -- "${APP_DIR}/site.next"
  install -d -m 0755 "${APP_DIR}/site.next/creator-first-platform"
  tar -xzf "${SITE_ARCHIVE}" -C "${APP_DIR}/site.next/creator-first-platform"
  test -s "${APP_DIR}/site.next/creator-first-platform/demo/index.html"

  rm -rf -- "${APP_DIR}/site.previous"
  if [[ -d "${APP_DIR}/site" ]]; then
    mv "${APP_DIR}/site" "${APP_DIR}/site.previous"
  fi
  mv "${APP_DIR}/site.next" "${APP_DIR}/site"
  rm -f -- "${SITE_ARCHIVE}"
elif [[ ! -s "${APP_DIR}/site/creator-first-platform/demo/index.html" ]]; then
  echo "CREATOR_FIRST_DEPLOY_STATUS=failed_missing_site"
  exit 1
fi

if [[ ! -s "${APP_DIR}/bootstrap/.htpasswd" ]]; then
  bootstrap_password="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  password_hash="$(openssl passwd -apr1 "${bootstrap_password}")"
  printf 'creator-first-demo:%s\n' "${password_hash}" > "${APP_DIR}/bootstrap/.htpasswd"
  printf '%s\n' "${bootstrap_password}" > "${APP_DIR}/bootstrap/password"
  chmod 0600 "${APP_DIR}/bootstrap/password"
fi
chmod 0644 "${APP_DIR}/bootstrap/.htpasswd"

cat > "${APP_DIR}/bootstrap/docs-nginx.conf" <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    location = / {
        return 302 /creator-first-platform/demo/;
    }

    location /creator-first-platform/ {
        try_files $uri $uri.html $uri/ =404;
    }
}
NGINX

cat > "${APP_DIR}/bootstrap/nginx.conf" <<'NGINX'
server {
    listen 8080;
    server_name _;

    location ^~ /api/ {
        auth_basic off;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_pass http://participant-gateway:8787;
    }

    location ^~ /creator-first-platform/ {
        auth_basic off;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_pass http://docs-demo:80;
    }

    location / {
        auth_basic "Creator First test environment";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Remote-User creator-first-demo-admin;
        proxy_set_header Authorization "";
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_pass http://navidrome:4533;
    }
}
NGINX

if [[ ! -s "${APP_DIR}/music/local-test-tone.wav" ]]; then
  ffmpeg -hide_banner -loglevel error -f lavfi -i 'sine=frequency=440:duration=12' \
    -metadata title='Creator First Test Tone' \
    -metadata artist='Creator First Platform' \
    -metadata album='Synthetic Test Audio' \
    -ar 44100 -ac 2 "${APP_DIR}/music/local-test-tone.wav"
fi
chmod 0644 "${APP_DIR}/music/local-test-tone.wav"

cd "${APP_DIR}"
docker-compose -p creator-first-streaming pull navidrome-data-init navidrome docs-demo gateway-data-init bootstrap-gateway cloudflared
docker-compose -p creator-first-streaming up -d --remove-orphans
cat > /etc/systemd/system/creator-first-gmail-relay.service <<'UNIT'
[Unit]
Description=Creator First bounded Gmail IPv6 transport relay
After=docker.service network-online.target
Requires=docker.service

[Service]
ExecStart=/usr/bin/socat TCP4-LISTEN:1465,bind=172.31.0.1,reuseaddr,fork TCP6:smtp.gmail.com:465
Restart=always
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now creator-first-gmail-relay.service
# The static site directory is atomically replaced above. Recreate containers
# that bind-mount it so they cannot keep serving the previous directory inode.
docker-compose -p creator-first-streaming up -d --force-recreate --no-deps docs-demo bootstrap-gateway cloudflared

tunnel_url=""
for tunnel_attempt in $(seq 1 30); do
  tunnel_url="$(docker-compose -p creator-first-streaming logs --no-color cloudflared 2>&1 \
    | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' \
    | tail -n 1 || true)"
  [[ -n "${tunnel_url}" ]] && break
  sleep 2
done
if [[ -z "${tunnel_url}" ]]; then
  echo "CREATOR_FIRST_DEPLOY_STATUS=failed_missing_tunnel_url"
  exit 1
fi
tunnel_host="${tunnel_url#https://}"
cat > "${APP_DIR}/bootstrap/gateway.env" <<ENV
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8787
GATEWAY_BASE_PATH=/api
GATEWAY_RUNTIME_MODE=public-experiment
GATEWAY_ALLOWED_ORIGIN=${tunnel_url}
GATEWAY_PUBLIC_URI=${tunnel_url}
GATEWAY_SIWE_DOMAIN=${tunnel_host}
GATEWAY_WEBAUTHN_ORIGIN=${tunnel_url}
GATEWAY_WEBAUTHN_RP_ID=${tunnel_host}
GATEWAY_MAIL_MODE=gmail-smtp
GATEWAY_GMAIL_ADDRESS=11rou.yamasaki@gmail.com
GATEWAY_GMAIL_NETWORK_FAMILY=4
GATEWAY_GMAIL_CONNECT_HOST=172.31.0.1
GATEWAY_GMAIL_IMPLICIT_TLS_PORT=1465
GATEWAY_GMAIL_APP_PASSWORD_FILE=/run/secrets/gmail-app-password
GATEWAY_ADMIN_TOKEN_FILE=/run/secrets/admin-token
GATEWAY_DATABASE_PATH=/data/gateway.sqlite
GATEWAY_MEDIA_ADAPTER=file
GATEWAY_MEDIA_ROOT=/music
GATEWAY_CHAIN_ID=80002
GATEWAY_INVITATION_PUBLIC_URL=${tunnel_url}/creator-first-platform/demo/participant-registration
GATEWAY_APPLICATION_STATUS_PUBLIC_URL=${tunnel_url}/creator-first-platform/demo/participant-application-status
ENV
chmod 0640 "${APP_DIR}/bootstrap/gateway.env"
docker-compose -p creator-first-streaming up -d --force-recreate --no-deps participant-gateway

for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/creator-first-platform/demo/ >/dev/null && \
    curl -fsS http://127.0.0.1:8080/api/v1/health >/dev/null && \
    systemctl is-active --quiet creator-first-gmail-relay.service && \
    curl -fsS -u "creator-first-demo:$(cat "${APP_DIR}/bootstrap/password")" http://127.0.0.1:8080/ >/dev/null; then
    echo "CREATOR_FIRST_DEPLOY_STATUS=healthy"
    echo "CREATOR_FIRST_DEMO_PATH=/creator-first-platform/demo/"
    echo "CREATOR_FIRST_TUNNEL_URL=${tunnel_url}"
    docker-compose -p creator-first-streaming ps
    exit 0
  fi
  sleep 5
done

echo "CREATOR_FIRST_DEPLOY_STATUS=failed"
docker-compose -p creator-first-streaming ps || true
docker-compose -p creator-first-streaming logs --tail=200 || true
exit 1
