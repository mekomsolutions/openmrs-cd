/**
 * Second script of the Webhook job.
 *
 * Sets the project to be built based on the project type form the metadata object.
 * The project to be built is passed downstream through an env. variable.
 *
 * Relies on the presence of metadata.json on the file system as "input parameter".
 */

"use strict";
const fs = require("fs");
const path = require("path");
const log = require("npmlog");

const utils = require("../utils/utils");
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const model = require("./model");

var metadata = JSON.parse(
  fs.readFileSync(config.getCommitMetadataFilePath(), "utf8")
);

var projectTypesByTriggerJob = JSON.parse(
  fs.readFileSync(config.getWebhookTriggersFilePath(), "utf8")
);

// checking if the project type can be found in the list of trigger project types
// and if yes retains the downstream jobs that should be triggered
// REMARK: it currently handles only one possible downstream job
var downstreamJob = {};
for (var triggerJob in projectTypesByTriggerJob) {
  if (projectTypesByTriggerJob.hasOwnProperty(triggerJob)) {
    if (metadata.projectType.indexOf(projectTypesByTriggerJob[triggerJob])) {
      downstreamJob[config.varDownstreamJob()] = triggerJob; // eg: {"downstream_job" : "pipeline1"}
    }
  }
}

log.info(
  "",
  "Those are the downstream jobs that will be triggered by the project type '" +
    metadata.projectType +
    "':"
);
log.info("", utils.convertToEnvVar(downstreamJob));

// Export the downstream job as an env. variable
fs.writeFileSync(
  process.env.WORKSPACE + "/trigger.env",
  utils.convertToEnvVar(downstreamJob)
);
