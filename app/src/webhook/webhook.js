/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
const fs = require("fs");
const utils = require("../utils/utils");
const log = require("npmlog");

// The PayloadParser is loaded based on what the SCM service is
var payloadParser = require("./impl/" + process.env.service);

var payloadString = process.env.payload;

metadata = payloadParser.parsePayload(payloadString);

metadata.type = process.env.type;

// Export the environment variables
fs.writeFileSync("/tmp/metadata.env", utils.convertToEnvVar(metadata));
fs.writeFileSync("/tmp/metadata.json", JSON.stringify(metadata));

log.info("", utils.convertToEnvVar(metadata));
