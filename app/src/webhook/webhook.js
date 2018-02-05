/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
var fs = require("fs");
var utils = require("../utils/utils");

// The PayloadParser is loaded based on what the SCM service is
var payloadParser = require("./impl/" + process.env.service);

var payloadString = process.env.payload;

metadata = payloadParser.parsePayload(payloadString);

metadata.type = process.env.type;

// Export the environment variables
fs.writeFileSync("/tmp/metadata.env", utils.convertToEnvVar(metadata));
fs.writeFileSync("/tmp/metadata.json", JSON.stringify(metadata));

console.log(utils.convertToEnvVar(metadata));
