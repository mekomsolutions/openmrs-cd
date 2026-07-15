#!/usr/bin/env bash
# Build keys/authorized_keys for the jump/target image:
# - all public keys from ~/.ssh (same keys openmrscd mounts via docker-compose)
# - plus the local vagrant test key (for ssh_config smoke tests)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KEYS_DIR="$ROOT/keys"
AUTH_KEYS="$KEYS_DIR/authorized_keys"
TEST_KEY="$KEYS_DIR/id_ed25519"
TEST_PUB="$KEYS_DIR/id_ed25519.pub"

mkdir -p "$KEYS_DIR"

if [[ ! -f "$TEST_KEY" ]]; then
  ssh-keygen -t ed25519 -f "$TEST_KEY" -N "" -C "openmrs-cd-vagrant-test"
fi

: >"$AUTH_KEYS"

shopt -s nullglob
local_pubs=("$HOME"/.ssh/*.pub)
if ((${#local_pubs[@]} == 0)); then
  echo "warning: no public keys found in ~/.ssh/*.pub" >&2
  echo "         openmrscd mounts ~/.ssh; add a key there before testing deploys." >&2
else
  for pub in "${local_pubs[@]}"; do
    echo "Including $pub"
    cat "$pub" >>"$AUTH_KEYS"
    echo >>"$AUTH_KEYS"
  done
fi

echo "Including $TEST_PUB"
cat "$TEST_PUB" >>"$AUTH_KEYS"
echo >>"$AUTH_KEYS"

# Deduplicate identical lines
awk 'NF && !seen[$0]++' "$AUTH_KEYS" >"$AUTH_KEYS.tmp"
mv "$AUTH_KEYS.tmp" "$AUTH_KEYS"

echo "Wrote $AUTH_KEYS ($(grep -c . "$AUTH_KEYS" || true) key(s))"
