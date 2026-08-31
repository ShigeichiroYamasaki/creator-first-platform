#!/usr/bin/env bash
set -Eeuo pipefail

readonly KEYCHAIN_SERVICE=creator-first-platform-gateway-admin
readonly KEYCHAIN_ACCOUNT=creator-first-navidrome-demo

if [[ "$#" -ne 2 ]]; then
  echo "Usage: $0 INSTANCE_NAME ZONE" >&2
  exit 2
fi

readonly INSTANCE_NAME="$1"
readonly INSTANCE_ZONE="$2"

if ! command -v security >/dev/null || ! command -v gcloud >/dev/null; then
  echo "This helper requires macOS Keychain and gcloud." >&2
  exit 1
fi

secret_file="$(mktemp)"
cleanup() {
  if [[ -f "${secret_file}" ]]; then
    chmod 0600 "${secret_file}" || true
    dd if=/dev/zero of="${secret_file}" bs=128 count=1 conv=notrunc >/dev/null 2>&1 || true
    rm -f -- "${secret_file}"
  fi
}
trap cleanup EXIT
chmod 0600 "${secret_file}"
security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w > "${secret_file}"

if [[ ! "$(<"${secret_file}")" =~ ^[0-9a-f]{64}$ ]]; then
  echo "The stored Gateway administrator token is not a 256-bit lowercase hexadecimal value." >&2
  exit 1
fi

gcloud compute instances add-metadata "${INSTANCE_NAME}" \
  --zone "${INSTANCE_ZONE}" \
  --metadata-from-file "gateway-admin-token=${secret_file}"

echo "The Gateway administrator token was added to transient instance metadata."
echo "Restart the VM, verify administrator access, then remove the gateway-admin-token metadata item."
