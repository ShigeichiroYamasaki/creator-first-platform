#!/usr/bin/env bash
set -Eeuo pipefail

readonly KEYCHAIN_SERVICE=creator-first-platform-participant-operator
readonly KEYCHAIN_ACCOUNT=creator-first-amoy-demo

if [[ "$#" -ne 3 ]]; then
  echo "Usage: $0 INSTANCE_NAME ZONE PARTICIPANT_REGISTRY_ADDRESS" >&2
  exit 2
fi

readonly INSTANCE_NAME="$1"
readonly INSTANCE_ZONE="$2"
readonly REGISTRY_ADDRESS="$3"

if [[ ! "${REGISTRY_ADDRESS}" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "PARTICIPANT_REGISTRY_ADDRESS must be an EVM address." >&2
  exit 2
fi
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

gcloud compute instances add-metadata "${INSTANCE_NAME}" \
  --zone "${INSTANCE_ZONE}" \
  --metadata "participant-registry-address=${REGISTRY_ADDRESS}" \
  --metadata-from-file "gateway-participant-operator-private-key=${secret_file}"

echo "Participant registry address and transient operator secret were added to instance metadata. Restart the VM, verify a healthy deployment, then remove gateway-participant-operator-private-key from metadata."

