"use strict";

/**
 * @param {string} process.env.instanceDefinitionEvent - Parts of an instance definition that have changed.
 * A entire instance definition is also a possible occurrence.
 */

const fs = require("fs");
const path = require("path");

const utils = require(path.resolve("src/utils/utils"));
const config = require("../utils/config");

const validator = require("./validator");

const log = require("npmlog");
const _ = require("lodash");
const uuid = require("uuid/v4");

//
// finding the existing instance definition
//
var instanceEvent = {};
if (process.env.instanceDefinitionEvent) {
  instanceEvent = JSON.parse(process.env.instanceDefinitionEvent);
}
var instances = JSON.parse(
  fs.readFileSync(config.getInstancesConfigPath(), "utf8")
);
var existingInstance = utils.findInstanceInList(
  instanceEvent.uuid,
  instanceEvent.name,
  instances
);
var isNewInstance = _.isEmpty(existingInstance);

//
// in-depth validation
//
validator.validateInstanceDefinition(instanceEvent, isNewInstance);

//
// adding/merging the instance definition event (in)to the list of managed instances
//
instanceEvent.uuid = existingInstance.uuid || uuid();
utils.setObjectStatus(instanceEvent, "Instance definition validated");

Object.assign(existingInstance, instanceEvent);

instances = _.reject(instances, function(el) {
  return el.uuid === existingInstance.uuid;
});
instances.push(existingInstance);
fs.writeFileSync(
  config.getInstancesConfigPath(),
  JSON.stringify(instances, null, 2)
);

//
// setting the downstream job parameters
//
var downstreamJobParams = {};
downstreamJobParams[
  config.varDownstreamJob()
] = config.getJobNameForPipeline3();
downstreamJobParams[config.varInstanceUuid()] = instanceEvent.uuid;
downstreamJobParams[config.varArtifactsChanges()] = JSON.stringify(
  !_.isEmpty(instanceEvent.artifacts)
);
downstreamJobParams[config.varDeploymentChanges()] = JSON.stringify(
  !_.isEmpty(instanceEvent.deployment)
);
downstreamJobParams[config.varDataChanges()] = JSON.stringify(
  !_.isEmpty(instanceEvent.data)
);

//
// Export the downstream job parameters as a 'trigger' properties file
//
fs.writeFileSync(
  path.resolve(
    config.getBuildDirPath(),
    config.getProjectBuildTriggerEnvvarsName()
  ),
  utils.convertToEnvVar(downstreamJobParams)
);
