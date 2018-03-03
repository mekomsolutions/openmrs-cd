"use strict";
/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
const fs = require("fs");
const utils = require("../utils/utils");
const config = require("../utils/config");
const log = require("npmlog");
const descriptorService = require(__dirname + "/descriptorService");

var servers = {};

try {
  servers = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
} catch (err) {
  log.warn(
    "",
    "There is no servers list configuration file on this server, or the file content is corrupt and could not be loaded."
  );
  log.warn("", err);
}

descriptorService.fetchRemoteDistroDescriptors(servers, function(
  errors,
  result
) {
  if (errors.length != 0) {
    log.error(
      "",
      "There were errors during the fetching of servers descriptors."
    );
    log.error("", "One or more server(s) may have an invalid descriptor URL.");
    console.dir(errors);
    throw new Error();
  }
  var descriptors = result;

  log.info("", descriptors);
  fs.writeFileSync(
    config.getServersDescriptorsPath(),
    JSON.stringify(descriptors, null, 2)
  );
});
