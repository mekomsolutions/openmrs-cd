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
if (!isNewInstance && _.isEqual(existingInstance.type, "prod")) {
  //
  // A 'prod' type existing instance should not trigger any downstream job (https://mekomsolutions.atlassian.net/browse/INFRA-201)
  //
  log.warn(
    "",
    "Existing instance '" +
      instanceEvent.name +
      "' is of type 'prod' or is set to 'active:false'. No modification will be applied. Aborting.\n"
  );
  // Setting downstream job to empty
  downstreamJobParams[config.varDownstreamJob()] = "";
} else if (
  //
  // Handle 'active' flag
  //
  instanceEvent.active == "false" ||
  (_.isEmpty(instanceEvent.active) && existingInstance.active == "false")
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
  // Adding/merging the instance definition event (in)to the list of managed instances
  db.saveInstanceDefinition(instanceEvent);

  // Setting downstream job to Pipeline3
  downstreamJobParams[
    config.varDownstreamJob()
  ] = config.getJobNameForPipeline3();
}

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

// Set the build name
var buildName = [];
buildName[config.varBuildName()] =
  existingInstance.active == "false" ? "[INACTIVE] " : "";
buildName[config.varBuildName()] +=
  existingInstance.name + " - " + existingInstance.uuid;

//
// Export the downstream job parameters as a 'environment' properties file
//
fs.writeFileSync(
  config.getProjectBuildEnvvarsPath(),
  utils.convertToEnvVar(Object.assign(buildName, downstreamJobParams))
);
