/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

// The Project is loaded based on what the project type value
var project = require('./impl/' + process.env.type).getInstance();

// Retrieve the script to run in order to build the project
var buildScript = project.getBuildScriptAsString()
fs.writeFileSync(process.env.WORKSPACE + "/build.sh", buildScript)

fs.chmodSync(process.env.WORKSPACE + "/build.sh", 0755);

// Retrieve the artifact details that will be built
var artifact = project.getArtifact()
// Export the artifact details in order for the pipeline to use it
fs.writeFileSync(process.env.WORKSPACE + "/artifact.env", utils.convertToEnvVar(artifact))

