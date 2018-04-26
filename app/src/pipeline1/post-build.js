/**
 *
 */

"use strict";

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const utils = require("../utils/utils");

const fs = require("fs");
const path = require("path");
const log = require("npmlog");

var projectBuild = require("./impl/" +
  process.env[config.varProjectType()]).getInstance();

var artifactsIds = [];
try {
  // artifacts IDs of all the Maven (sub)modules found, so one per POM found
  artifactsIds = fs
    .readFileSync(config.getArtifactIdListFilePath(), "utf-8")
    .toString()
    .split("\n");
} catch (err) {
  log.warn(
    "",
    "No artifacts IDs were extracted out of the POM files, is this not a Maven project?"
  );
  log.warn("", JSON.stringify(err, null, 2));
}

projectBuild.postBuildActions({
  pom: utils.getPom(config.getBuildPomPath()),
  artifactsIds: artifactsIds
});
