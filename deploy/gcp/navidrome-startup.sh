#!/usr/bin/env bash
set -Eeuo pipefail

exec > >(tee -a /var/log/creator-first-startup.log) 2>&1

readonly APP_DIR=/opt/creator-first-streaming
readonly METADATA_URL=http://metadata.google.internal/computeMetadata/v1/instance/attributes

echo "CREATOR_FIRST_DEPLOY_STATUS=starting"

export DEBIAN_FRONTEND=noninteractive

# The Google package repositories in the stock image are not consistently
# reachable from an IPv6-only VM. The guest agent is already installed, and
# this demo only needs packages from Debian's IPv6-capable mirrors.
for source_file in /etc/apt/sources.list.d/google*.list; do
  if [[ -e "${source_file}" ]]; then
    mv "${source_file}" "${source_file}.disabled"
  fi
done

apt-get update
apt-get install -y --no-install-recommends ca-certificates curl docker.io docker-compose ffmpeg openssl
systemctl enable --now docker

install -d -m 0750 "${APP_DIR}/bootstrap" "${APP_DIR}/music"
chmod 0755 "${APP_DIR}/music"
curl -fsS -H 'Metadata-Flavor: Google' "${METADATA_URL}/navidrome-compose" -o "${APP_DIR}/compose.yml"

if [[ ! -s "${APP_DIR}/bootstrap/.htpasswd" ]]; then
  bootstrap_password="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  password_hash="$(openssl passwd -apr1 "${bootstrap_password}")"
  printf 'creator-first-demo:%s\n' "${password_hash}" > "${APP_DIR}/bootstrap/.htpasswd"
  printf '%s\n' "${bootstrap_password}" > "${APP_DIR}/bootstrap/password"
  chmod 0600 "${APP_DIR}/bootstrap/password"
fi
chmod 0644 "${APP_DIR}/bootstrap/.htpasswd"

cat > "${APP_DIR}/bootstrap/nginx.conf" <<'NGINX'
server {
    listen 8080;
    server_name _;

    auth_basic "Creator First test environment";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
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
docker-compose -p creator-first-streaming pull
docker-compose -p creator-first-streaming up -d

for attempt in $(seq 1 60); do
  if curl -fsS -u "creator-first-demo:$(cat "${APP_DIR}/bootstrap/password")" \
    http://127.0.0.1:8080/ >/dev/null; then
    echo "CREATOR_FIRST_DEPLOY_STATUS=healthy"
    echo "CREATOR_FIRST_BOOTSTRAP_USER=creator-first-demo"
    echo "CREATOR_FIRST_BOOTSTRAP_PASSWORD=$(cat "${APP_DIR}/bootstrap/password")"
    for tunnel_attempt in $(seq 1 30); do
      tunnel_url="$(docker-compose -p creator-first-streaming logs --no-color cloudflared 2>&1 \
        | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' \
        | tail -n 1 || true)"
      if [[ -n "${tunnel_url}" ]]; then
        echo "CREATOR_FIRST_TUNNEL_URL=${tunnel_url}"
        break
      fi
      sleep 2
    done
    docker-compose -p creator-first-streaming ps
    exit 0
  fi
  sleep 5
done

echo "CREATOR_FIRST_DEPLOY_STATUS=failed"
docker-compose -p creator-first-streaming ps || true
docker-compose -p creator-first-streaming logs --tail=200 || true
exit 1
