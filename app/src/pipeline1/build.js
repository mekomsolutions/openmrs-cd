/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
const fs = require("fs");
const utils = require("../utils/utils");
const log = require("npmlog");

// The Project is loaded based on what the projectBuild type value
var projectBuild = require("./impl/" + process.env.projectType).getInstance();

var metadata = {}; // the commit metadata, parsed out from the SCM service commit payload
try {
  if (process.argv[2] !== undefined) {
    metadata = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  } else {
    log.info("", "The build process is continuing with no artifact metadata.");
    log.info("", "There was no optional argument passed to " + __filename);
  }
} catch (err) {
  log.error(
    "",
    "Artifact metadata file not present (usually created by a webhook upstream job)"
  );
  log.error("", err);
  process.exit(1);
}

// Retrieve the details of the artifact that will be built
var artifact = projectBuild.getArtifact("./", metadata);

// Retrieve the script to build the projectBuild
var buildScript = projectBuild.getBuildScriptAsString();
fs.writeFileSync(process.env.WORKSPACE + "/build.sh", buildScript);
fs.chmodSync(process.env.WORKSPACE + "/build.sh", 0755);

// Retrieve the script to deploy the projectBuild
var deployScript = projectBuild.getDeployScriptAsString(artifact);
fs.writeFileSync(process.env.WORKSPACE + "/deploy.sh", deployScript);
fs.chmodSync(process.env.WORKSPACE + "/deploy.sh", 0755);

// Export the artifact info in order for the pipeline and other jobs to use it
fs.writeFileSync("/tmp/artifact.env", utils.convertToEnvVar(artifact));
fs.writeFileSync("/tmp/artifact.json", JSON.stringify(artifact, null, 2));
