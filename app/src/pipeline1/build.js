/**
 * @return build.sh
 * @return deploy.sh
 * @return artifact.env
 * @return artifact.json
 */
"use strict";
const fs = require("fs");
const utils = require("../utils/utils");
const config = require("../utils/config");
const log = require("npmlog");

var commitMetadata = {}; // the commit metadata, parsed out from the SCM service commit payload
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
  process.exit(1);
}

// The ProjectBuild is loaded based on the project type
var projectBuild = require("./impl/" + process.env.projectType).getInstance();

// Retrieve the details of the artifact that will be built
var artifact = projectBuild.getArtifact("./", commitMetadata);

// Retrieve the script to build the projectBuild
var buildScript = projectBuild.getBuildScriptAsString();
fs.writeFileSync(process.env.WORKSPACE + "/build.sh", buildScript);
fs.chmodSync(process.env.WORKSPACE + "/build.sh", "0755");

// Retrieve the script to deploy the projectBuild
var deployScript = projectBuild.getDeployScriptAsString(artifact);
fs.writeFileSync(process.env.WORKSPACE + "/deploy.sh", deployScript);
fs.chmodSync(process.env.WORKSPACE + "/deploy.sh", "0755");

// Export the artifact info in order for the pipeline and other jobs to use it
fs.writeFileSync(
  config.getArtifactEnvvarsPath(),
  utils.convertToEnvVar(artifact)
);
fs.writeFileSync("/tmp/artifact.json", JSON.stringify(artifact, null, 2));
