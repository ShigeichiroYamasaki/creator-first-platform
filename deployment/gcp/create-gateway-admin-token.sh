#!/usr/bin/env bash
set -Eeuo pipefail

readonly KEYCHAIN_SERVICE=creator-first-platform-gateway-admin
readonly KEYCHAIN_ACCOUNT=creator-first-navidrome-demo

if ! command -v security >/dev/null || ! command -v openssl >/dev/null; then
  echo "This helper requires macOS Keychain and openssl." >&2
  exit 1
fi

if security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" >/dev/null 2>&1; then
  echo "The Gateway administrator token already exists in macOS Keychain. It was not changed."
  exit 0
fi

admin_token_value="$(openssl rand -hex 32)"
security add-generic-password \
  -s "${KEYCHAIN_SERVICE}" \
  -a "${KEYCHAIN_ACCOUNT}" \
  -w "${admin_token_value}" >/dev/null
unset admin_token_value

echo "A new Gateway administrator token was generated and stored in macOS Keychain."
echo "The token itself was not printed. Provision it to the VM before using the administrator page."
