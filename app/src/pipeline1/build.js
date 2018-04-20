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
const cst = require("../const");
const config = require(cst.CONFIGPATH);

//
// the commit metadata, parsed out from the SCM service commit payload
//
var commitMetadata = {};
try {
  if (process.argv[2] !== undefined) {
    commitMetadata = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  } else {
    log.info(
      "",
      "The build process is continuing with no commit metadata provided."
    );
    log.info("", "There was no optional argument passed to " + __filename);
  }
} catch (err) {
  log.error(
    "",
    "The commit metadata file is either missing at the specified path or is malformed (it is usually created by an upstream webhook job.)"
  );
  log.error("", err);
  throw new Error();
}

//
// The ProjectBuild is loaded based on the project type
//
var projectBuild = require("./impl/" +
  process.env[config.varProjectType()]).getInstance();

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
  utils.convertToEnvVar(artifact)
);
fs.writeFileSync(
  config.getBuildArtifactJsonPath(),
  JSON.stringify(artifact, null, 2)
);
