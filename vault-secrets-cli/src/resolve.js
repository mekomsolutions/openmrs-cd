"use strict";

const fs = require("fs");
const path = require("path");
const vaultRefs = require("./vault-refs");
const vault = require("./vault");

function loadInstanceDefinition(options) {
  var hasFile = !!options.instance;
  var hasJson = options.instanceJson !== undefined && options.instanceJson !== null;
  if (hasFile === hasJson) {
    throw new Error(
      "Provide exactly one of --instance <file> or --instance-json <json>."
    );
  }

  var raw;
  if (hasFile) {
    raw = fs.readFileSync(options.instance, "utf8");
  } else {
    raw = options.instanceJson;
  }

  var instanceDef;
  try {
    instanceDef = JSON.parse(raw);
  } catch (e) {
    throw new Error("Instance definition is not valid JSON: " + e.message);
  }
  if (!instanceDef || typeof instanceDef !== "object" || Array.isArray(instanceDef)) {
    throw new Error("Instance definition must be a single JSON object.");
  }
  return instanceDef;
}

function defaultOutputPath(instanceDef) {
  var name = instanceDef.name || "instance";
  return path.join("/var/run/ocd3", name, "secrets.env");
}

function escapeEnvValue(value) {
  var text = String(value);
  if (/[\s#"']/.test(text) || text.includes("\\") || text.includes("=")) {
    return JSON.stringify(text);
  }
  return text;
}

/**
 * Resolves vault() refs in envVars and writes a compose env_file.
 * @returns {{outputPath: string, keys: string[]}}
 */
async function resolveAndWrite(options, env) {
  env = env || process.env;
  var instanceDef = loadInstanceDefinition(options);
  var outputPath = options.output || defaultOutputPath(instanceDef);

  var refs = vaultRefs.findVaultReferences(instanceDef);
  var envVars = instanceDef.envVars || {};
  var vaultEnvKeys = Object.keys(envVars).filter(function(key) {
    return vaultRefs.containsVaultRef(envVars[key]);
  });

  if (refs.length === 0) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, "", { mode: 0o600 });
    return { outputPath: outputPath, keys: [] };
  }

  var token = await vault.login(env);
  var secrets = {};
  for (var i = 0; i < refs.length; i++) {
    var ref = refs[i];
    secrets[ref.reference] = await vault.readSecret(
      env,
      token,
      ref.path,
      ref.key
    );
  }

  var lines = [];
  vaultEnvKeys.forEach(function(key) {
    var resolved = vaultRefs.substituteVaultRefsInString(envVars[key], secrets);
    lines.push(key + "=" + escapeEnvValue(resolved));
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(outputPath, lines.join("\n") + (lines.length ? "\n" : ""), {
    mode: 0o600
  });

  return { outputPath: outputPath, keys: vaultEnvKeys };
}

module.exports = {
  loadInstanceDefinition: loadInstanceDefinition,
  defaultOutputPath: defaultOutputPath,
  resolveAndWrite: resolveAndWrite,
  escapeEnvValue: escapeEnvValue
};
