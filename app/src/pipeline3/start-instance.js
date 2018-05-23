"use strict";
/**
 * Main script of the 'start instance' stage.
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

//
//  Fetching the instance definition based on the provided UUID
//
var instanceDef = db.getInstanceDefinition(
  process.env[config.varInstanceUuid()]
);
if (_.isEmpty(instanceDef)) {
  throw new Error("Illegal argument: empty or unexisting instance definition.");
}

//
//  Host metadata
//
var ssh = instanceDef.deployment.host.value; // TODO this should be extracted based on the host type
var hostDir = instanceDef.deployment.hostDir;

//
//  Building the script
//
var script = new model.Script();
script.type = "#!/bin/bash";
script.headComment = "# Autogenerated script for the CD instance start...";
script.body = "set -e\n";

// 'artifacts'

if (process.env[config.varArtifactsChanges()] === "true") {
  if (!(process.env[config.varDeploymentChanges()] === "true")) {
    script.body += scripts.remote(
      ssh,
      scripts.container.restart(instanceDef.uuid)
    );
  }
}

// 'deployment'

if (process.env[config.varDeploymentChanges()] === "true") {
  if (instanceDef.deployment.type === "docker") {
    script.body += scripts.remote(
      ssh,
      scripts.container.remove(instanceDef.uuid)
    );
    script.body += scripts.remote(
      ssh,
      scripts.container.run(instanceDef.uuid, instanceDef)
    );
  }
}

//
//  Saving the script in the current build dir.
//
fs.writeFileSync(
  path.resolve(config.getBuildDirPath(), config.getStartInstanceScriptName()),
  utils.getScriptAsString(script)
);
fs.chmodSync(
  path.resolve(config.getBuildDirPath(), config.getStartInstanceScriptName()),
  "0755"
);
