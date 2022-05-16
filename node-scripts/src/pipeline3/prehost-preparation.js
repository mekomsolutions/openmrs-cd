"use strict";

/**
 * Main script of the 'pre-host preparation' stage.
 *
 * @param {String} process.env[config.varInstanceUuid()] - The instance definition UUID.
 * @param {Boolean/String} process.env[config.varArtifactsChanges()] - 'true' if the artifacts section should be processed, 'false' otherwise
 * @param {Boolean/String} process.env[config.varDataChanges()] - 'true' if the data section should be processed, 'false' otherwise
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

const currentStage = config.getPrehostPrepareStatusCode();

// Fetch secrets:
// const secrets = config.getSecrets();

//
//  Fetching the instance definition based on the provided UUID
//
var instanceDef = db.getInstanceDefinition(
  process.env[config.varInstanceUuid()]
);
if (_.isEmpty(instanceDef)) {
  throw new Error("Illegal argument: empty or unexisting instance definition.");
}

const container = require("./impl/" + instanceDef.deployment.type);

//
//  Building the script
//
var script = new model.Script();
script.type = "#!/bin/bash";
script.headComment =
  "# Autogenerated script for the CD instance preparation prior to connecting to the host...";
script.body = [];
script.body.push("set -xe");

var ssh = instanceDef.deployment.host.value; // TODO this should be extracted based on the host type
var hostDir = (hostDir = path.resolve(
  instanceDef.deployment.hostDir,
  instanceDef.name
));

// Status
if (instanceDef.active == false) {
  script.body.push(
    scripts.remote(
      ssh,
      container.stop(
        instanceDef,
        false,
        instanceDef.type == cst.INSTANCETYPE_PROD ? true : false
      )
    )
  );
  script.body.push(utils.exit());
}

// Deployment
const containerScripts = require("./impl/" + instanceDef.deployment.type);
script.body.push(
  containerScripts.preHostPreparation.getDeploymentScript(instanceDef)
);
// 'artifacts'

if (process.env[config.varArtifactsChanges()] === "true") {
  var artifactsDirPath = config.getCDArtifactsDirPath(instanceDef.uuid);
  script.body.push(
    scripts.initFolder(artifactsDirPath, "jenkins", "jenkins", true)
  );

  instanceDef.artifacts.forEach(function(artifact) {
    script.body.push(
      scripts.fetchArtifact(artifact.value, artifact.type, artifactsDirPath)
    );
  });
}

// 'data'

script.body.push(
  scripts.remote(
    instanceDef.deployment.host.value,
    containerScripts.preHostPreparation.getDataScript(instanceDef)
  )
);

script.body = script.body.join(cst.SCRIPT_SEPARATOR);

//
//  Saving the script in the current build dir.
//
fs.writeFileSync(
  path.resolve(config.getBuildDirPath(), config.getPrehostPrepareScriptName()),
  utils.getScriptAsString(script)
);
fs.chmodSync(
  path.resolve(config.getBuildDirPath(), config.getPrehostPrepareScriptName()),
  "0755"
);

// Saving the status
fs.writeFileSync(
  path.resolve(config.getBuildDirPath(), config.getStatusFileName()),
  JSON.stringify({ status: currentStage })
);
