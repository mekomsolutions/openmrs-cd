# Test SSH keys

`vagrant up` runs `prepare-authorized-keys.sh`, which:

1. Ensures `id_ed25519` / `id_ed25519.pub` exist (smoke-test keypair).
2. Builds `authorized_keys` from **`~/.ssh/*.pub`** (same keys `openmrscd` mounts via `docker-compose`) plus the test public key.

`authorized_keys` is gitignored (machine-local). Do not commit private keys.

```bash
# regenerate authorized_keys only
../prepare-authorized-keys.sh   # from keys/, or:
bash prepare-authorized-keys.sh # from vagrant/
```
