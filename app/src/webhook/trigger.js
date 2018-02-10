/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
const fs = require("fs");
const utils = require("../utils/utils");
const log = require("npmlog");

var metadata = JSON.parse(fs.readFileSync("/tmp/metadata.json", "utf8"));

var triggers = JSON.parse(
  fs.readFileSync("/usr/share/jenkins/webhook_triggers.json", "utf8")
);

var project = {};

for (var trigger in triggers) {
  if (triggers.hasOwnProperty(trigger)) {
    if (metadata.type.indexOf(triggers[trigger])) {
      project = {
        project: trigger
      };
    }
  }
}

// Export the project as environment variable
fs.writeFileSync(
  process.env.WORKSPACE + "/trigger.env",
  utils.convertToEnvVar(project)
);
fs.writeFileSync(
  process.env.WORKSPACE + "/trigger.json",
  JSON.stringify(project)
);

log.info("", utils.convertToEnvVar(project));