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
const path = require("path");
const log = require("npmlog");

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const utils = require("../utils/utils");

// The ad-hoc PayloadParser instance is loaded based on the SCM service
const payloadParser = require("./impl/" + process.env.scmService);

var commitMetadata = payloadParser.parsePayload(process.env.payload);
commitMetadata[config.varProjectType()] = process.env[config.varProjectType()];

// For downstream trigger reuse:
fs.writeFileSync(
  // as envvars
  config.getCommitMetadataFileEnvvarsPath(),
  utils.convertToEnvVar(commitMetadata)
);
fs.writeFileSync(
  // and ALSO as a JSON file
  config.getCommitMetadataFilePath(),
  JSON.stringify(commitMetadata)
);

log.info(
  "",
  "The '" +
    process.env.service +
    "' payload produced the following commit metadata:"
);
log.info("", utils.convertToEnvVar(commitMetadata));
