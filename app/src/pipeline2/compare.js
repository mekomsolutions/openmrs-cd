/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
const fs = require("fs");
const utils = require("../utils/utils");
const model = require("../models/model");
const log = require("npmlog");

var dependenciesDir = "/tmp";
var historyDir = "/var/jenkins_home";
var dependencies = JSON.parse(
  fs.readFileSync(dependenciesDir + "/dependencies.json")
);

try {
  var artifact = JSON.parse(
    fs.readFileSync(dependenciesDir + "/artifact.json")
  );
} catch (err) {
  log.error(
    "",
    "Unable to retrieve the 'artifact.json' file. This file is supposed to be created by upstream job(s) to describe the current artifact being built."
  );
  log.error("", "Please run the needed upstream job(s) first.");
  log.error("", err);
  process.exit(1);
}

var history = {};
try {
  history = JSON.parse(fs.readFileSync(historyDir + "/history.json"));
} catch (err) {
  log.warn(
    "",
    "No history file found or unable to retrieve it. This may not be an error if you are running this for the first time"
  );
  log.warn("", err);
}

// 'history' is passed by reference so it will be updated in the function

utils.setMatchingServersAndUpdateHistory(
  dependencies,
  history,
  new model.ServerEvent(Date.now(), artifact)
);

fs.writeFileSync(
  historyDir + "/history.json",
  JSON.stringify(history, null, 2)
);
