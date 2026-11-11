"use strict";

const VAULT_REF_REGEXP = /vault\(([^)#]+)#([^)]+)\)/g;

/**
 * Finds every vault(path#key) reference in a value (object, array, or string).
 * @returns {Array<{path: string, key: string, reference: string}>}
 */
function findVaultReferences(value) {
  var text = typeof value === "string" ? value : JSON.stringify(value);
  var refs = [];
  var seen = {};
  var match;
  var regexp = new RegExp(VAULT_REF_REGEXP.source, "g");
  while ((match = regexp.exec(text)) !== null) {
    var reference = match[1] + "#" + match[2];
    if (!seen[reference]) {
      seen[reference] = true;
      refs.push({ path: match[1], key: match[2], reference: reference });
    }
  }
  return refs;
}

/**
 * Substitutes vault(path#key) in a string using a map keyed by path#key.
 */
function substituteVaultRefsInString(text, vaultSecrets) {
  return String(text).replace(VAULT_REF_REGEXP, function(match, secretPath, key) {
    var reference = secretPath + "#" + key;
    var secret = (vaultSecrets || {})[reference];
    if (secret === undefined || secret === null) {
      throw new Error(
        "Vault secret '" +
          reference +
          "' was not resolved. Check that Vault is configured and that the path and key exist."
      );
    }
    return String(secret);
  });
}

function containsVaultRef(value) {
  return findVaultReferences(value).length > 0;
}

module.exports = {
  VAULT_REF_REGEXP: VAULT_REF_REGEXP,
  findVaultReferences: findVaultReferences,
  substituteVaultRefsInString: substituteVaultRefsInString,
  containsVaultRef: containsVaultRef
};
