"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const nock = require("nock");
const resolve = require("../src/resolve");

describe("resolve", function() {
  var tmpDir;

  beforeEach(function() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-secrets-cli-"));
    nock.cleanAll();
  });

  afterEach(function() {
    nock.cleanAll();
  });

  it("requires exactly one instance source", function() {
    expect(function() {
      resolve.loadInstanceDefinition({});
    }).toThrowError(/exactly one/);
    expect(function() {
      resolve.loadInstanceDefinition({
        instance: "a.json",
        instanceJson: "{}"
      });
    }).toThrowError(/exactly one/);
  });

  it("loads instance JSON from a string", function() {
    var def = resolve.loadInstanceDefinition({
      instanceJson: '{"name":"test-instance","envVars":{}}'
    });
    expect(def.name).toEqual("test-instance");
  });

  it("loads instance JSON from a file", function() {
    var file = path.join(tmpDir, "instance.json");
    fs.writeFileSync(file, JSON.stringify({ name: "from-file" }));
    var def = resolve.loadInstanceDefinition({ instance: file });
    expect(def.name).toEqual("from-file");
  });

  it("writes secrets.env for envVars with vault refs", function(done) {
    var output = path.join(tmpDir, "secrets.env");
    nock("http://vault:8200")
      .post("/v1/auth/approle/login")
      .reply(200, { auth: { client_token: "tok" } });
    nock("http://vault:8200")
      .get("/v1/secret/data/c2c/dev")
      .reply(200, { data: { data: { db_password: "s3cret" } } });

    resolve
      .resolveAndWrite(
        {
          instanceJson: JSON.stringify({
            name: "test-instance",
            envVars: {
              PLAIN: "ok",
              DB_PASSWORD: "vault(secret/c2c/dev#db_password)"
            }
          }),
          output: output
        },
        {
          VAULT_ADDR: "http://vault:8200",
          VAULT_AUTH_METHOD: "approle",
          VAULT_ROLE_ID: "role",
          VAULT_SECRET_ID: "secret"
        }
      )
      .then(function(result) {
        expect(result.keys).toEqual(["DB_PASSWORD"]);
        expect(fs.readFileSync(output, "utf8")).toEqual(
          "DB_PASSWORD=s3cret\n"
        );
        done();
      })
      .catch(done.fail);
  });

  it("uses token auth without login when VAULT_TOKEN is set", function(done) {
    var output = path.join(tmpDir, "secrets.env");
    nock("http://vault:8200")
      .get("/v1/secret/data/c2c/dev")
      .reply(200, { data: { data: { db_password: "from-token" } } });

    resolve
      .resolveAndWrite(
        {
          instanceJson: JSON.stringify({
            name: "test-instance",
            envVars: {
              DB_PASSWORD: "vault(secret/c2c/dev#db_password)"
            }
          }),
          output: output
        },
        {
          VAULT_ADDR: "http://vault:8200",
          VAULT_AUTH_METHOD: "token",
          VAULT_TOKEN: "root"
        }
      )
      .then(function() {
        expect(fs.readFileSync(output, "utf8")).toEqual(
          "DB_PASSWORD=from-token\n"
        );
        done();
      })
      .catch(done.fail);
  });
});
