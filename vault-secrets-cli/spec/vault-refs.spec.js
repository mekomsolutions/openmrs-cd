"use strict";

const vaultRefs = require("../src/vault-refs");

describe("vault-refs", function() {
  it("finds unique vault references in nested objects", function() {
    var refs = vaultRefs.findVaultReferences({
      envVars: {
        DB_PASSWORD: "vault(secret/c2c/dev#db_password)",
        URL: "mysql://root:vault(secret/c2c/dev#db_password)@db",
        API_KEY: "vault(secret/c2c/dev#api_key)"
      }
    });
    expect(refs.map(function(r) {
      return r.reference;
    })).toEqual([
      "secret/c2c/dev#db_password",
      "secret/c2c/dev#api_key"
    ]);
  });

  it("substitutes vault refs in a string", function() {
    expect(
      vaultRefs.substituteVaultRefsInString(
        "p=vault(secret/c2c/dev#db_password)",
        { "secret/c2c/dev#db_password": "s3cret" }
      )
    ).toEqual("p=s3cret");
  });

  it("detects vault refs", function() {
    expect(vaultRefs.containsVaultRef("vault(secret/a#b)")).toBe(true);
    expect(vaultRefs.containsVaultRef("plain")).toBe(false);
  });
});
