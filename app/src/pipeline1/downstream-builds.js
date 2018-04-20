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

//
//  Running the post build routine specific to the current project type
//
var projectBuild = require("./impl/" +
  process.env[config.varProjectType()]).getInstance();

projectBuild.postBuildActions({
  pom: utils.getPom(config.getBuildPomPath()),
  artifactsIds: cmns.getMavenArtifactIds(config.getArtifactIdListFilePath())
});
