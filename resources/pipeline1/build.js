/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

// The Project is loaded based on what the project type value
var project = require('./' + process.env.type).getInstance();

fs.writeFile(process.env.WORKSPACE + "/build.sh", project.getBuildScriptAsString() , function(err) {
  if (err) {
    return console.log(err);
  }
});

fs.chmodSync(process.env.WORKSPACE + "/build.sh", 0755);

// Export the artifact details in order for the pipeline to use it
var artifact = project.getArtifact();
fs.writeFile(process.env.WORKSPACE + "/artifact.env", utils.convertToEnvVar(artifact) , function(err) {
  if (err) {
    return console.log(err);
  }
});

