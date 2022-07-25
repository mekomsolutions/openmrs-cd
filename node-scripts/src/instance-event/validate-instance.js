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

log.info("", "Instance Event being processed:\n" + instanceEvent);
//
// in-depth validation
//
validator.validateInstanceDefinition(instanceEvent, isNewInstance);

var downstreamJobParams = {};

if (instanceEvent.active == "false") {
  db.saveInstanceDefinition({
    uuid: existingInstance.uuid,
    name: existingInstance.name,
    active: "false"
  });
  downstreamJobParams[
    config.varDownstreamJob()
  ] = config.getJobNameForPipeline3();
  downstreamJobParams[config.varInstanceUuid()] = instanceEvent.uuid;
  var displayName = instanceEvent.name ? instanceEvent.name : "no-name-set";
  downstreamJobParams[config.varInstanceName()] = displayName;
  downstreamJobParams[config.varArtifactsChanges()] = JSON.stringify(false);
  downstreamJobParams[config.varDeploymentChanges()] = JSON.stringify(false);
  downstreamJobParams[config.varDataChanges()] = JSON.stringify(false);
  downstreamJobParams[config.varPropertiesChanges()] = JSON.stringify(false);
  downstreamJobParams[config.varCreation()] = JSON.stringify(false);
} else if (
  _.isEmpty(instanceEvent.active) &&
  existingInstance.active == "false"
) {
  db.saveInstanceDefinition({
    uuid: existingInstance.uuid,
    name: existingInstance.name,
    active: "false"
  });
  log.warn(
    "",
    "Instance '" +
      existingInstance.name +
      "' is considered inactive. Aborting.\n"
  );
  // Setting downstream job to empty
  downstreamJobParams[config.varDownstreamJob()] = "";
} else {
  db.saveInstanceDefinition(instanceEvent);

  // Setting downstream job to Pipeline3
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
  downstreamJobParams[config.varPropertiesChanges()] = JSON.stringify(
    !_.isEmpty(instanceEvent.properties)
  );
  downstreamJobParams[config.varCreation()] = JSON.stringify(isNewInstance);
}

// Set the build name
var buildName = [];
buildName[config.varBuildName()] =
  existingInstance.name + " - " + existingInstance.uuid;
downstreamJobParams["instanceActive"] = JSON.stringify(
  _.isEmpty(instanceEvent.active) ? true : instanceEvent.active
);

//
// Export the downstream job parameters as a 'environment' properties file
//
fs.writeFileSync(
  config.getProjectBuildEnvvarsPath(),
  utils.convertToProperties(Object.assign(buildName, downstreamJobParams))
);
