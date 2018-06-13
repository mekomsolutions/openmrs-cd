"use strict";

/**
 * @param {string} process.env.instanceDefinitionEvent - Parts of an instance definition that have changed.
 * A entire instance definition is also a possible occurrence.
 */

const fs = require("fs");
const path = require("path");

const utils = require("../utils/utils");
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);

const validator = require("./validator");

const log = require("npmlog");
const _ = require("lodash");
const uuid = require("uuid/v4");

//
// finding the existing instance definition
//
var instanceEvent = {};
if (process.env[config.varInstanceEvent()]) {
  instanceEvent = JSON.parse(process.env[config.varInstanceEvent()]);
}
var existingInstance = db.getInstanceDefinition(
  instanceEvent.uuid,
  instanceEvent.name
);
var isNewInstance = _.isEmpty(existingInstance);

//
// in-depth validation
//
validator.validateInstanceDefinition(instanceEvent, isNewInstance);

//
// adding/merging the instance definition event (in)to the list of managed instances
//
db.saveInstanceDefinition(instanceEvent);

//
// setting the downstream job parameters
//
var downstreamJobParams = {};
downstreamJobParams[
  config.varDownstreamJob()
] = config.getJobNameForPipeline3();
downstreamJobParams[config.varInstanceUuid()] = instanceEvent.uuid;
var displayName = instanceEvent.name ? instanceEvent.name : "no-name-set";
downstreamJobParams[config.varInstanceName()] = displayName;
downstreamJobParams[config.varArtifactsChanges()] = JSON.stringify(
  !_.isEmpty(instanceEvent.artifacts)
);
downstreamJobParams[config.varDeploymentChanges()] = JSON.stringify(
  !_.isEmpty(instanceEvent.deployment)
);
downstreamJobParams[config.varDataChanges()] = JSON.stringify(
  !_.isEmpty(instanceEvent.data)
);
downstreamJobParams[config.varCreation()] = JSON.stringify(isNewInstance);

//
// Export the downstream job parameters as a 'trigger' properties file
//
fs.writeFileSync(
  config.getProjectBuildTriggerEnvvarsPath(),
  utils.convertToEnvVar(downstreamJobParams)
);
