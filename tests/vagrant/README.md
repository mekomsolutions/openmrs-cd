# Jump / target test hosts

Local **jump** and **target** SSH hosts for exercising openmrs-cd deployments. Uses the Vagrant **Docker** provider.

Host ports use `23022` / `23023` (not `2222`) to avoid clashing with Vagrant’s default SSH forward.

## Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Vagrant](https://developer.hashicorp.com/vagrant/downloads)
- At least one public key in `~/.ssh/*.pub` (the same keys `docker-compose` mounts into `openmrscd` as `~/.ssh`)

## Start

```bash
cd tests/vagrant
vagrant up
```

On every `vagrant up`, [`prepare-authorized-keys.sh`](prepare-authorized-keys.sh) builds `keys/authorized_keys` from:

1. All `~/.ssh/*.pub` on your machine (so Jenkins/`openmrscd` can deploy with your mounted keys)
2. The local vagrant test key (`keys/id_ed25519.pub`) for [`ssh_config`](ssh_config) smoke tests

| Host   | Role                         | Host port               | Docker network alias |
|--------|------------------------------|-------------------------|----------------------|
| jump   | Bastion / ProxyJump entry    | `127.0.0.1:23022` → 22  | `jump`               |
| target | Deployment server            | `127.0.0.1:23023` → 22  | `target`             |

Shared Docker network: `openmrs-cd-jump`. User on both hosts: `cdagent` (passwordless sudo).

The **target** also mounts the host Docker socket and volume `ocd3-run` at `/run/ocd3` so host preparation can run `vault-secrets-cli` and write secrets under `/run/ocd3`.

If you add a new key under `~/.ssh`, rebuild so the image picks it up:

```bash
vagrant destroy -f && vagrant up
```

## Smoke tests

From the `tests/vagrant/` directory (uses the baked-in test key via `ssh_config`):

```bash
# Direct to target (no jump):
ssh -F ssh_config target-direct hostname

# Via jump → target (ProxyJump):
ssh -F ssh_config target-via-jump hostname
```

You can also SSH with your normal agent / default identity (no `-F`), since your `~/.ssh/*.pub` keys are authorized:

```bash
ssh -p 23023 -o StrictHostKeyChecking=no cdagent@127.0.0.1 hostname
```

`ssh_config` disables host-key prompts for local testing. OCD itself emits plain `ssh -J …` (see `scripts.remote`); set up `known_hosts` or `StrictHostKeyChecking` in the Jenkins agent environment as you would for any SSH deploy.

## Pairing with openmrscd

From the repo root:

```bash
docker-compose up
```

`openmrscd` mounts `~/.ssh`. Your public keys are already on jump/target, so deploys from Jenkins can authenticate without copying the vagrant test private key.

Use `host.docker.internal` from inside the container to reach published ports on the Docker host (Docker Desktop). On Linux, if that hostname is missing, use the host gateway IP (often `172.17.0.1`) or add `extra_hosts: ["host.docker.internal:host-gateway"]` under the `openmrscd` service.

### Instance host — direct deploy

```json
"host": {
  "type": "ssh",
  "value": {
    "ip": "host.docker.internal",
    "user": "cdagent",
    "port": "23023"
  }
}
```

### Instance host — via jump

```json
"host": {
  "type": "ssh",
  "value": {
    "ip": "target",
    "user": "cdagent",
    "port": "22",
    "jumpHost": {
      "ip": "host.docker.internal",
      "user": "cdagent",
      "port": "23022"
    }
  }
}
```

With ProxyJump, Jenkins only needs to reach the jump; hostname `target` is resolved from the jump container on `openmrs-cd-jump`.

## Vault AppRole on the target (host vault-secrets-cli)

The **target** runs `docker run mekomsolutions/vault-secrets-cli` during host preparation. It uses the host Docker daemon (`/var/run/docker.sock`) and a shared volume `ocd3-run` mounted at `/run/ocd3`.

With local Vault already up (`docker compose --profile vault up -d`):

```bash
cd tests/vagrant
./setup-vault-approle.sh
```

That script:

1. Enables AppRole and KV v2 `secret/` in the local Vault container
2. Creates policy/role `ocd3-dev` with read on `secret/data/c2c/dev` (+ metadata)
3. Writes sample `secret/c2c/dev` with `db_password=test-secret`
4. Installs `/etc/profile.d/ocd3-vault.sh` on the target (`VAULT_ADDR=http://host.docker.internal:8200`, AppRole ids)

### Smoke test

```bash
ssh -F ssh_config target-direct 'bash --login -c "
set -e
mkdir -p /run/ocd3/test-instance
cat > /run/ocd3/test-instance/instance.json <<EOF
{\"name\":\"test-instance\",\"vault\":{\"approlePath\":\"approle\",\"secretsFile\":\"/run/ocd3/test-instance/secrets.env\"},\"envVars\":{\"DB_PASSWORD\":\"vault(secret/c2c/dev#db_password)\"}}
EOF
docker run --rm \
  -e VAULT_ADDR -e VAULT_AUTH_METHOD -e VAULT_ROLE_ID -e VAULT_SECRET_ID -e VAULT_APPROLE_PATH \
  -v ocd3-run:/out \
  mekomsolutions/vault-secrets-cli:latest \
  resolve --instance /out/test-instance/instance.json --output /out/test-instance/secrets.env
sudo cat /run/ocd3/test-instance/secrets.env
"'
```

Expect `DB_PASSWORD=test-secret`.

For a full OCD3 deploy against this target, use the host block under **Instance host — direct deploy** and set `vault.approlePath` / `vault.secretsFile` on the instance. Ensure `mekomsolutions/vault-secrets-cli:latest` exists on the host Docker daemon.

## Tear down

```bash
cd tests/vagrant && vagrant destroy -f
docker network rm openmrs-cd-jump   # optional
docker volume rm ocd3-run           # optional
```
