/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

// The Project is loaded based on what the project type value
var project = require('./impl/' + process.env.type).getInstance();

var metadata = ""
try {
  metadata = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
} catch (err) {
  console.log("Optional object passed as first argument could not be fetched. Skipping")
}

// Retrieve the script to build the project
var buildScript = project.getBuildScriptAsString()
fs.writeFileSync(process.env.WORKSPACE + "/build.sh", buildScript)
fs.chmodSync(process.env.WORKSPACE + "/build.sh", 0755);

// Retrieve the script to deploy the project
var deployScript = project.getDeployScriptAsString()
fs.writeFileSync(process.env.WORKSPACE + "/deploy.sh", deployScript)
fs.chmodSync(process.env.WORKSPACE + "/deploy.sh", 0755);

// Retrieve the details of the artifact that will be built
var artifact = project.getArtifact('./', metadata)
// Export the artifact info in order for the pipeline and other jobs to use it
fs.writeFileSync("/tmp/artifact.env", utils.convertToEnvVar(artifact))
fs.writeFileSync("/tmp/artifact.json", JSON.stringify(artifact))

