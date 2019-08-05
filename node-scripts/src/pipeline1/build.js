/**
 * @return build.sh
 * @return deploy.sh
 * @return artifact.env
 * @return artifact.json
 */

"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");

const utils = require("../utils/utils");
const model = require("../utils/model");
const cst = require("../const");
const config = require(cst.CONFIGPATH);

//
// The commit metadata whose parts are passed as the build params
//
const projectType = process.env[config.varProjectType()];
const commitMetadata = new model.CommitMetadata(
  projectType,
  process.env[config.varRepoUrl()],
  process.env[config.varBranchName()],
  process.env[config.varCommitId()]
);

//
// The ProjectBuild is loaded based on the project type
//
var projectBuild = require("./impl/" + projectType).getInstance();

// Retrieve the details of the artifact that will be built
var artifact = projectBuild.getArtifact({
  pom: utils.getPom(config.getBuildPomPath()),
  commitMetadata: commitMetadata
});

// Retrieve the script to build the projectBuild
var buildScript = projectBuild.getBuildScript();
fs.writeFileSync(
  config.getBuildShellScriptPath(),
  utils.getScriptAsString(buildScript)
);
fs.chmodSync(config.getBuildShellScriptPath(), "0755");

//
// Retrieve the script to deploy the projectBuild
//
var deployScript = projectBuild.getDeployScript(artifact);
fs.writeFileSync(
  config.getDeployShellScriptPath(),
  utils.getScriptAsString(deployScript)
);
fs.chmodSync(config.getDeployShellScriptPath(), "0755");

//
// Export the whole artifact for further steps & stages
//
fs.writeFileSync(
  config.getBuildArtifactEnvvarsPath(),
  utils.convertToProperties(artifact)
);
fs.writeFileSync(
  config.getBuildArtifactJsonPath(),
  JSON.stringify(artifact, null, 2)
);
