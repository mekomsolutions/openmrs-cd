/**
 * Runs the post-build actions for each types of artifacts.
 *
 * Typically: trigger the rebuild of distributions affected by a change in the current artifact,
 * or persists the current build parameters to give a way to rebuild this exact artifact should
 * it be affected by a change in another artifact.
 */

"use strict";

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const utils = require("../utils/utils");
const cmns = require("./commons");

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const log = require("npmlog");

//
//  Running the post build routine specific to the current project type
//
var projectBuild = require("./impl/" + cmns.getProjectType()).getInstance();

//
//  Reading the list of artifact IDs extracted from the POMs in Groovy (see .jenkinsfile)
//
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
artifactsIds = artifactsIds.filter(function(el) {
  return el.trim() !== "";
});

//
//  Plan B since there is no POM and this is not a Maven project.
//  Getting the 'pseudo' Maven info that was attached to the built artifact during the build stage.
//
var pseudoPom = {};
if (_.isEmpty(artifactsIds)) {
  var arty = JSON.parse(
    fs.readFileSync(config.getBuildArtifactJsonPath(), "utf-8")
  );
  pseudoPom = _.pick(arty.mavenProject, ["groupId", "artifactId", "version"]);
}

projectBuild.postBuildActions({
  pom: utils.getPom(config.getBuildPomPath()),
  artifactsIds: artifactsIds,
  pseudoPom: pseudoPom
});
