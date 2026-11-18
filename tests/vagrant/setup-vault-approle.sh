#!/usr/bin/env bash
# Seed local Vault with AppRole + sample KV, then install VAULT_* on the Vagrant target.
# Usage (from tests/vagrant): ./setup-vault-approle.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root}"
POLICY_NAME="${POLICY_NAME:-ocd3-dev}"
ROLE_NAME="${ROLE_NAME:-ocd3-dev}"
SECRET_PATH="${SECRET_PATH:-c2c/dev}"
TARGET_VAULT_ADDR="${TARGET_VAULT_ADDR:-http://host.docker.internal:8200}"
VAULT_CONTAINER="${VAULT_CONTAINER:-vault}"

export VAULT_ADDR VAULT_TOKEN

vault() {
  docker exec \
    -e VAULT_ADDR=http://127.0.0.1:8200 \
    -e VAULT_TOKEN \
    "${VAULT_CONTAINER}" \
    vault "$@"
}

echo "==> Vault container '${VAULT_CONTAINER}' (API ${VAULT_ADDR})"

echo "==> Enabling AppRole auth (idempotent)"
vault auth enable approle 2>/dev/null || true

echo "==> Ensuring KV v2 at secret/"
vault secrets enable -path=secret kv-v2 2>/dev/null || true

echo "==> Writing policy ${POLICY_NAME}"
POLICY_HCL=$(cat <<EOF
path "secret/data/${SECRET_PATH}" {
  capabilities = ["read"]
}
path "secret/metadata/${SECRET_PATH}" {
  capabilities = ["read"]
}
EOF
)
printf '%s\n' "${POLICY_HCL}" | docker exec -i \
  -e VAULT_ADDR=http://127.0.0.1:8200 \
  -e VAULT_TOKEN \
  "${VAULT_CONTAINER}" \
  vault policy write "${POLICY_NAME}" -

echo "==> Creating AppRole ${ROLE_NAME}"
vault write "auth/approle/role/${ROLE_NAME}" \
  token_policies="${POLICY_NAME}" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0

VAULT_ROLE_ID="$(vault read -field=role_id "auth/approle/role/${ROLE_NAME}/role-id")"
VAULT_SECRET_ID="$(vault write -field=secret_id -f "auth/approle/role/${ROLE_NAME}/secret-id")"

echo "==> Writing sample secret secret/${SECRET_PATH}"
vault kv put "secret/${SECRET_PATH}" db_password=test-secret

echo ""
echo "VAULT_ROLE_ID=${VAULT_ROLE_ID}"
echo "VAULT_SECRET_ID=${VAULT_SECRET_ID}"
echo ""

SSH=(ssh -F "${ROOT}/ssh_config" -o BatchMode=yes target-direct)

echo "==> Ensuring Docker socket and /run/ocd3 usable on target"
"${SSH[@]}" "sudo chmod 666 /var/run/docker.sock 2>/dev/null || true"
"${SSH[@]}" "sudo mkdir -p /run/ocd3 && sudo chown -R cdagent:cdagent /run/ocd3"
"${SSH[@]}" "docker version --format '{{.Client.Version}}' >/dev/null"

echo "==> Writing /etc/profile.d/ocd3-vault.sh on target"
"${SSH[@]}" "sudo tee /etc/profile.d/ocd3-vault.sh >/dev/null" <<EOF
export VAULT_ADDR=${TARGET_VAULT_ADDR}
export VAULT_AUTH_METHOD=approle
export VAULT_ROLE_ID=${VAULT_ROLE_ID}
export VAULT_SECRET_ID=${VAULT_SECRET_ID}
export VAULT_APPROLE_PATH=approle
EOF
"${SSH[@]}" "sudo chmod 644 /etc/profile.d/ocd3-vault.sh"

echo "==> Done. AppRole env is available on login shells on the target."
echo "    Smoke test: see tests/vagrant/README.md"
