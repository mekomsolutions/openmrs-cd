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
  process.env.WORKSPACE + "/" + config.getBuildShellScriptName(),
  utils.getScriptAsString(buildScript)
);
fs.chmodSync(
  process.env.WORKSPACE + "/" + config.getBuildShellScriptName(),
  "0755"
);

//
// Retrieve the script to deploy the projectBuild
//
var deployScript = projectBuild.getDeployScript(artifact);
fs.writeFileSync(
  process.env.WORKSPACE + "/" + config.getDeployShellScriptName(),
  utils.getScriptAsString(deployScript)
);
fs.chmodSync(
  process.env.WORKSPACE + "/" + config.getDeployShellScriptName(),
  "0755"
);

//
// Export the artifact info in order for the pipeline and other jobs to use it
//
fs.writeFileSync(
  config.getChangedArtifactEnvvarsPath(),
  utils.convertToEnvVar(artifact)
);
fs.writeFileSync(
  config.getChangedArtifactJsonPath(),
  JSON.stringify(artifact, null, 2)
);
