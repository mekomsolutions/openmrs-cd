#!groovy

// Configures the HashiCorp Vault plugin from environment variables.
// Vault stays disabled when VAULT_ADDR is not set.
// AppRole is the default login. Token is a fallback when ROLE_ID/SECRET_ID are missing.

import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import com.datapipe.jenkins.vault.configuration.GlobalVaultConfiguration
import com.datapipe.jenkins.vault.configuration.VaultConfiguration
import com.datapipe.jenkins.vault.credentials.VaultAppRoleCredential
import com.datapipe.jenkins.vault.credentials.VaultKubernetesCredential
import com.datapipe.jenkins.vault.credentials.VaultTokenCredential
import hudson.util.Secret

def env = System.getenv()
def log = { msg -> println "[vault.groovy] ${msg}" }
def credentialId = "ocd3-vault"
def vaultAddr = env.VAULT_ADDR

if (!vaultAddr) {
  log "VAULT_ADDR is not set. Vault integration is disabled."
  return
}

def authMethod = (env.VAULT_AUTH_METHOD ?: "approle").toLowerCase()
if (authMethod == "approle" && !(env.VAULT_ROLE_ID && env.VAULT_SECRET_ID)) {
  if (env.VAULT_TOKEN) {
    log "VAULT_ROLE_ID/VAULT_SECRET_ID are not set; falling back to token auth for local development."
    authMethod = "token"
  } else {
    throw new IllegalArgumentException("VAULT_ROLE_ID and VAULT_SECRET_ID must be set when VAULT_AUTH_METHOD is 'approle' (or unset). Set VAULT_TOKEN to use token auth instead.")
  }
}

def required = { name ->
  def value = env[name]
  if (!value) {
    throw new IllegalArgumentException("${name} must be set when VAULT_AUTH_METHOD is '${authMethod}'")
  }
  return value
}

def description = "OCD3 Vault (${authMethod}) - managed by init.groovy.d/vault.groovy"
def credential

switch (authMethod) {
  case "token":
    credential = new VaultTokenCredential(CredentialsScope.GLOBAL, credentialId, description, Secret.fromString(required("VAULT_TOKEN")))
    break
  case "approle":
    credential = new VaultAppRoleCredential(CredentialsScope.GLOBAL, credentialId, description,
      required("VAULT_ROLE_ID"), Secret.fromString(required("VAULT_SECRET_ID")), env.VAULT_APPROLE_PATH ?: "approle")
    break
  case "kubernetes":
    credential = new VaultKubernetesCredential(CredentialsScope.GLOBAL, credentialId, description, required("VAULT_K8S_ROLE"))
    credential.setMountPath(env.VAULT_K8S_MOUNT ?: "kubernetes")
    break
  default:
    throw new IllegalArgumentException("Unsupported VAULT_AUTH_METHOD '${authMethod}'. Use token, approle or kubernetes.")
}

def store = SystemCredentialsProvider.getInstance().getStore()
def existing = SystemCredentialsProvider.getInstance().getCredentials().find { it.id == credentialId }
if (existing) {
  if (existing.class != credential.class) {
    store.removeCredentials(Domain.global(), existing)
    store.addCredentials(Domain.global(), credential)
  } else {
    store.updateCredentials(Domain.global(), existing, credential)
  }
} else {
  store.addCredentials(Domain.global(), credential)
}

def vaultConfig = new VaultConfiguration()
vaultConfig.setVaultUrl(vaultAddr)
vaultConfig.setVaultCredentialId(credentialId)
vaultConfig.setEngineVersion((env.VAULT_KV_VERSION ?: "2") as Integer)
vaultConfig.setFailIfNotFound(true)
if (env.VAULT_NAMESPACE) {
  vaultConfig.setVaultNamespace(env.VAULT_NAMESPACE)
}
if (env.VAULT_SKIP_VERIFY == "true") {
  vaultConfig.setSkipSslVerification(true)
}

def global = GlobalVaultConfiguration.get()
global.setConfiguration(vaultConfig)
global.save()

log "Configured Vault at ${vaultAddr} using '${authMethod}' auth (credential '${credentialId}')."
