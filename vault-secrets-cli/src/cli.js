#!/usr/bin/env node
"use strict";

const resolve = require("./resolve");

function printUsage() {
  console.error(`Usage:
  vault-secrets-cli resolve --instance <file> [--output <path>]
  vault-secrets-cli resolve --instance-json <json> [--output <path>]

Exactly one of --instance or --instance-json is required.
Default --output: /var/run/ocd3/<instance.name>/secrets.env

Auth (env):
  VAULT_ADDR (required)
  VAULT_AUTH_METHOD=approle|token (default approle)
  VAULT_ROLE_ID / VAULT_SECRET_ID (AppRole)
  VAULT_TOKEN (token auth or local fallback)
  VAULT_KV_VERSION=2|1 (default 2)
  VAULT_NAMESPACE, VAULT_SKIP_VERIFY, VAULT_APPROLE_PATH`);
}

function parseArgs(argv) {
  var args = { command: null, instance: null, instanceJson: null, output: null };
  if (!argv.length) {
    return args;
  }
  args.command = argv[0];
  for (var i = 1; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === "--instance") {
      args.instance = argv[++i];
    } else if (arg === "--instance-json") {
      args.instanceJson = argv[++i];
    } else if (arg === "--output") {
      args.output = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error("Unknown argument: " + arg);
    }
  }
  return args;
}

async function main(argv) {
  var args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    printUsage();
    process.exit(1);
  }

  if (args.help || args.command !== "resolve") {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  try {
    var result = await resolve.resolveAndWrite(
      {
        instance: args.instance,
        instanceJson: args.instanceJson,
        output: args.output
      },
      process.env
    );
    console.log(
      "Wrote " +
        result.keys.length +
        " secret(s) to " +
        result.outputPath
    );
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { parseArgs: parseArgs, main: main };
