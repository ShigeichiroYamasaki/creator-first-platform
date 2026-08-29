#!/usr/bin/env bash
set -Eeuo pipefail

readonly KEYCHAIN_SERVICE=creator-first-platform-gateway-admin
readonly KEYCHAIN_ACCOUNT=creator-first-navidrome-demo

if ! command -v security >/dev/null || ! command -v pbcopy >/dev/null; then
  echo "This helper requires macOS Keychain and pbcopy." >&2
  exit 1
fi

if ! security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w | pbcopy; then
  echo "The administrator token is not stored in this macOS Keychain." >&2
  exit 1
fi

echo "The Google Cloud demo administrator token was copied to the clipboard. Paste it only into the administrator page; the clipboard is cleared after 90 seconds."
(
  sleep 90
  pbcopy </dev/null
) >/dev/null 2>&1 &
