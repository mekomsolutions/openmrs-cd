/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
var fs = require("fs");
var utils = require("../utils/utils");
var log = require("npmlog");

var descriptorService = require(__dirname + "/descriptorService");
var servers = {};

try {
  servers = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
} catch (err) {
  log.error("", "No list of existing servers could be fetched.");
  log.error("", err);
}

descriptorService.fetchRemoteDistroDescriptors(servers, function(
  errors,
  result
) {
  if (errors.length != 0) {
    log.error("", "Errors have been encountered while downloading descriptors.");
    log.error("", "One or more server(s) may have an invalid descriptor URL.");
    console.dir(errors);
    process.exit(1);
  }
  var descriptors = result;

  log.info("", descriptors);
  fs.writeFileSync(
    "/tmp/descriptors.json",
    JSON.stringify(descriptors, null, 2)
  );
});