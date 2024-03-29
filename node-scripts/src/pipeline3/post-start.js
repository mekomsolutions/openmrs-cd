"use strict";

/**
 * Main script of the 'post start' stage.
 *
 */

const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const utils = require("../utils/utils");
const model = require("../utils/model");
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);

const scripts = require("./scripts");

const currentStage = config.getPostStartStatusCode();

//
//  Fetching the instance definition based on the provided UUID
//
var instanceDef = db.getInstanceDefinition(
  process.env[config.varInstanceUuid()]
);
if (_.isEmpty(instanceDef)) {
  throw new Error("Illegal argument: empty or unexisting instance definition.");
}

// Substitute secrets in the instance definiton with Jenkins credentials
instanceDef = utils.substituteSecrets(
  instanceDef,
  utils.mergeObjects(process.env[config.getSecretsEnvVar()])
);

//
//  Host metadata
//
var ssh = instanceDef.deployment.host.value; // TODO this should be extracted based on the host type

//
//  Building the script
//
var script = new model.Script();
script.type = "#!/bin/bash";
script.headComment =
  "# Autogenerated script for the instance post start operations...";
script.body = [];
script.body.push("set -e\n");

var finalRestart = false;
var container = require("./impl/" + instanceDef.deployment.type);

var computedScript = scripts.computeAdditionalScripts(
  script.body,
  instanceDef,
  currentStage,
  config,
  process.env
);
script.body = computedScript.script;

finalRestart += computedScript.restartNeeded;

if (finalRestart) {
  script.body.push(scripts.remote(ssh, container.restart(instanceDef)));
}

script.body = script.body.join(cst.SCRIPT_SEPARATOR);

//
//  Saving the script in the current build dir.
//
fs.writeFileSync(
  path.resolve(config.getBuildDirPath(), config.getPostStartScriptName()),
  utils.getScriptAsString(script)
);
fs.chmodSync(
  path.resolve(config.getBuildDirPath(), config.getPostStartScriptName()),
  "0755"
);

// Saving the status
fs.writeFileSync(
  path.resolve(config.getBuildDirPath(), config.getStatusFileName()),
  JSON.stringify({ status: currentStage })
);
