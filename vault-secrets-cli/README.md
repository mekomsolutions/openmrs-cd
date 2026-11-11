# vault-secrets-cli

Resolves `vault(path#key)` references from a single OCD3 instance definition into a Docker Compose `env_file` under `/var/run`.

## Usage

```bash
vault-secrets-cli resolve --instance /path/to/instance.json [--output /var/run/ocd3/<name>/secrets.env]
vault-secrets-cli resolve --instance-json '{"name":"...","envVars":{...}}' [--output ...]
```

Exactly one of `--instance` or `--instance-json` is required.

## Auth

| Mode | When |
|---|---|
| AppRole (default) | `VAULT_ROLE_ID` and `VAULT_SECRET_ID` set |
| Token | `VAULT_AUTH_METHOD=token`, or AppRole ids missing but `VAULT_TOKEN` set |

Logical paths omit KV v2 `data/` (e.g. `secret/c2c/dev`). The role needs `read` on `secret/data/...` and `secret/metadata/...`.

## Docker

```bash
docker build -t mekomsolutions/vault-secrets-cli .
./gradlew vault-secrets-cli:build
```
