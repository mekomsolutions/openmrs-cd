"use strict";

/**
 * @param {string}
 */

const fs = require("fs");
const utils = require("../utils/utils");
const config = require("../utils/config");
const validator = require("./validator");
const log = require("npmlog");

var instanceDef = {};
if (process.env.instanceDefinition) {
  instanceDef = JSON.parse(process.env.instanceDefinition);
}

validator.validateDeploymentConfig(instanceDef.deployment);
validator.validateArtifactsConfig(instanceDef.artifacts);

var isNewInstance = validator.isNewInstance(instanceDef.status);

if (!isNewInstance) {
  // TODO: Check that this instance can indeed be found in the list of managed instances.
  // While doing so we should probably check that the deployment mechanism has not changed.
  // If the deployment mechanism *has* changed this should likely direct the user to create
  // a new instance replacing the existing one.
}

var downstreamJob = {};
if (instanceDef.deployment.type == "docker") {
  downstreamJob[config.varDownstreamJob()] = config.getJobNameForPipeline3();
}

// Export the downstream job as an env. variable
fs.writeFileSync(
  process.env.WORKSPACE + "/" + config.getProjectBuildTriggerEnvvarsName(),
  utils.convertToEnvVar(downstreamJob)
);

var buildDetails = {};
// buildDetails[config.varBuildName()] = instanceDef.deployment.type + " - " + instanceDef.artifacts.type;
buildDetails[config.varBuildName()] =
  instanceDef.deployment.type + " - " + instanceDef.artifacts.type;
// buildDetails[config.varBuildDesc()] = JSON.stringify(instanceDef, null, 2);
fs.writeFileSync(
  process.env.WORKSPACE + "/" + config.getJobBuildDetailsEnvvarsName(),
  utils.convertToEnvVar(buildDetails)
);
