#!/usr/bin/env bash
set -Eeuo pipefail

readonly KEYCHAIN_SERVICE=creator-first-platform-supporter-relayer
readonly KEYCHAIN_ACCOUNT=creator-first-amoy-demo

if [[ "$#" -ne 5 ]]; then
  echo "Usage: $0 INSTANCE_NAME ZONE PARTICIPANT_REGISTRY_ADDRESS SUPPORTER_SBT_ADDRESS CREATOR_ID" >&2
  exit 2
fi

readonly INSTANCE_NAME="$1"
readonly INSTANCE_ZONE="$2"
readonly REGISTRY_ADDRESS="$3"
readonly SUPPORTER_SBT_ADDRESS="$4"
readonly CREATOR_ID="$5"

if [[ ! "${REGISTRY_ADDRESS}" =~ ^0x[0-9a-fA-F]{40}$ ]] || [[ ! "${SUPPORTER_SBT_ADDRESS}" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "Registry and Supporter SBT values must be EVM addresses." >&2
  exit 2
fi
if [[ ! "${CREATOR_ID}" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo "CREATOR_ID must be a bytes32 value." >&2
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
  --metadata "participant-registry-address=${REGISTRY_ADDRESS},supporter-sbt-address=${SUPPORTER_SBT_ADDRESS},supporter-creator-ids=${CREATOR_ID}" \
  --metadata-from-file "gateway-supporter-relayer-private-key=${secret_file}"

echo "Supporter relay configuration and transient secret were added. Restart, verify healthy relay status, then remove gateway-supporter-relayer-private-key metadata."
