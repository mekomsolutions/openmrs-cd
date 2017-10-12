/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');

// The PayloadParser is loaded based on what the SCM service is
var payloadParser = require('./' + process.env.service)

/**
* NOTE FOR DEVS:
* Run the following commands in your terminal session to run the script
* export payload=$(cat payload_example.json) type="mytype" service="github" WORKSPACE="./"
*/

var payloadString = process.env.payload

metadata = payloadParser.parsePayload(payloadString)

metadata.type = process.env.type

// Export the environment variables
fs.writeFile(process.env.WORKSPACE + "/envvars", convertToEnvVar(metadata), function(err) {
  if (err) {
    return console.log(err);
  }
});

console.log(convertToEnvVar(metadata))


/**
* @return Returns a concatenated string of all the properties of the passed object
*/
function convertToEnvVar(object) {
  var envvars = ""
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      envvars = envvars + property + "=" + object[property] + "\n";
    }
  }
  return envvars
}