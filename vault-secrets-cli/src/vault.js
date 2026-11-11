"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");

function request(method, urlString, headers, body) {
  return new Promise(function(resolve, reject) {
    var url = new URL(urlString);
    var lib = url.protocol === "http:" ? http : https;
    var options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === "http:" ? 80 : 443),
      path: url.pathname + url.search,
      method: method,
      headers: headers || {}
    };
    if (process.env.VAULT_SKIP_VERIFY === "true" && lib === https) {
      options.rejectUnauthorized = false;
    }
    var req = lib.request(options, function(res) {
      var chunks = [];
      res.on("data", function(chunk) {
        chunks.push(chunk);
      });
      res.on("end", function() {
        var raw = Buffer.concat(chunks).toString("utf8");
        var parsed = null;
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (e) {
          return reject(
            new Error(
              "Vault returned non-JSON (" + res.statusCode + "): " + raw
            )
          );
        }
        if (res.statusCode >= 400) {
          var msg =
            (parsed && parsed.errors && parsed.errors.join("; ")) ||
            raw ||
            "HTTP " + res.statusCode;
          return reject(new Error("Vault error (" + res.statusCode + "): " + msg));
        }
        resolve(parsed);
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function resolveAuthMethod(env) {
  var method = (env.VAULT_AUTH_METHOD || "approle").toLowerCase();
  if (method === "approle" && !(env.VAULT_ROLE_ID && env.VAULT_SECRET_ID)) {
    if (env.VAULT_TOKEN) {
      return "token";
    }
    throw new Error(
      "VAULT_ROLE_ID and VAULT_SECRET_ID must be set for AppRole auth (or set VAULT_TOKEN for token auth)."
    );
  }
  return method;
}

/**
 * Logs into Vault and returns a client token.
 */
async function login(env) {
  var addr = env.VAULT_ADDR;
  if (!addr) {
    throw new Error("VAULT_ADDR must be set.");
  }
  var method = resolveAuthMethod(env);
  var headers = { "Content-Type": "application/json" };
  if (env.VAULT_NAMESPACE) {
    headers["X-Vault-Namespace"] = env.VAULT_NAMESPACE;
  }

  if (method === "token") {
    if (!env.VAULT_TOKEN) {
      throw new Error("VAULT_TOKEN must be set for token auth.");
    }
    return env.VAULT_TOKEN;
  }

  if (method === "approle") {
    var mount = env.VAULT_APPROLE_PATH || "approle";
    var body = JSON.stringify({
      role_id: env.VAULT_ROLE_ID,
      secret_id: env.VAULT_SECRET_ID
    });
    var result = await request(
      "POST",
      addr.replace(/\/$/, "") + "/v1/auth/" + mount + "/login",
      headers,
      body
    );
    var token = result && result.auth && result.auth.client_token;
    if (!token) {
      throw new Error("AppRole login did not return a client token.");
    }
    return token;
  }

  throw new Error(
    "Unsupported VAULT_AUTH_METHOD '" + method + "'. Use approle or token."
  );
}

/**
 * Reads one key from a Vault secret.
 * logicalPath is e.g. secret/c2c/dev (mount/secretPath); KV v2 inserts data/.
 */
async function readSecret(env, token, logicalPath, key) {
  var addr = env.VAULT_ADDR.replace(/\/$/, "");
  var kvVersion = String(env.VAULT_KV_VERSION || "2");
  var parts = logicalPath.split("/");
  if (parts.length < 2) {
    throw new Error(
      "Invalid Vault path '" +
        logicalPath +
        "'. Expected mount/path (e.g. secret/c2c/dev)."
    );
  }
  var mount = parts[0];
  var secretPath = parts.slice(1).join("/");
  var apiPath =
    kvVersion === "1"
      ? "/v1/" + mount + "/" + secretPath
      : "/v1/" + mount + "/data/" + secretPath;

  var headers = { "X-Vault-Token": token };
  if (env.VAULT_NAMESPACE) {
    headers["X-Vault-Namespace"] = env.VAULT_NAMESPACE;
  }

  var result = await request("GET", addr + apiPath, headers);
  var data =
    kvVersion === "1"
      ? result && result.data
      : result && result.data && result.data.data;

  if (!data || data[key] === undefined || data[key] === null) {
    throw new Error(
      "Key '" + key + "' not found at Vault path '" + logicalPath + "'."
    );
  }
  return data[key];
}

module.exports = {
  login: login,
  readSecret: readSecret,
  resolveAuthMethod: resolveAuthMethod
};
