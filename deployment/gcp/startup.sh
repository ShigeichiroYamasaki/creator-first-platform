#!/usr/bin/env bash
set -Eeuo pipefail

exec > >(tee -a /var/log/creator-first-startup.log) 2>&1

readonly APP_DIR=/opt/creator-first-streaming
readonly METADATA_URL=http://metadata.google.internal/computeMetadata/v1/instance/attributes
readonly METADATA_HEADER='Metadata-Flavor: Google'
readonly SITE_ARCHIVE=/var/tmp/creator-first-demo-site.tar.gz

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

if ! command -v docker >/dev/null || ! command -v docker-compose >/dev/null || ! command -v ffmpeg >/dev/null; then
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl docker.io docker-compose ffmpeg openssl
fi
systemctl enable --now docker

install -d -m 0750 "${APP_DIR}/bootstrap" "${APP_DIR}/music"
chmod 0755 "${APP_DIR}/music"
metadata_value navidrome-compose > "${APP_DIR}/compose.yml"

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
docker-compose -p creator-first-streaming pull
docker-compose -p creator-first-streaming up -d --remove-orphans
# The static site directory is atomically replaced above. Recreate containers
# that bind-mount it so they cannot keep serving the previous directory inode.
docker-compose -p creator-first-streaming up -d --force-recreate docs-demo bootstrap-gateway cloudflared

for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/creator-first-platform/demo/ >/dev/null && \
    curl -fsS -u "creator-first-demo:$(cat "${APP_DIR}/bootstrap/password")" http://127.0.0.1:8080/ >/dev/null; then
    echo "CREATOR_FIRST_DEPLOY_STATUS=healthy"
    echo "CREATOR_FIRST_DEMO_PATH=/creator-first-platform/demo/"
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
