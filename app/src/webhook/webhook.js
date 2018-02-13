/**
 * First script of the Webhook job.
 *
 * It parses the HTTP payload in order to generate a reusable metadata object for downstream scripts.
 *
 * @param {string} process.env.service The SCM service (eg. 'github', ..)
 * @param {string} process.env.type The project type (eg. 'openmrsmodule', ..)
 * @param {string} process.env.payload The HTTP payload, typically some JSON data.
 */

"use strict";
const fs = require("fs");
const utils = require("../utils/utils");
const config = require("../utils/config");
const log = require("npmlog");

// The ad-hoc PayloadParser instance is loaded based on the SCM service
const payloadParser = require("./impl/" + process.env.service);

var metadata = payloadParser.parsePayload(process.env.payload);
metadata.projectType = process.env.type;

// For downstream reuse:
fs.writeFileSync(
  config.getTempDirPath() + "/metadata.env",
  utils.convertToEnvVar(metadata)
); // as envvars
fs.writeFileSync(config.getCommitMetadataFilePath(), JSON.stringify(metadata)); // and ALSO as a JSON file

log.info(
  "",
  "The '" + process.env.service + "' payload produced the following metadata:"
);
log.info("", utils.convertToEnvVar(metadata));
