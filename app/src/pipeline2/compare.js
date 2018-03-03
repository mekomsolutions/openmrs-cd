"use strict";
/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
const fs = require("fs");
const utils = require("../utils/utils");
const config = require("../utils/config");
const model = require("../models/model");
const log = require("npmlog");

var dependencies = JSON.parse(
  // mapping artifact key => servers list
  fs.readFileSync(config.getServersByArtifactKeysPath())
);

try {
  var artifact = JSON.parse(
    fs.readFileSync(config.getChangedArtifactJsonPath())
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

const changelogFilePath =
  config.getJenkinsHomePath() + "/" + config.getServersChangelogPath();

var history = {};
try {
  history = JSON.parse(fs.readFileSync(changelogFilePath));
} catch (err) {
  log.warn(
    "",
    "Unable to retrieve the servers change log file. This may not be an error if you are running this script for the first time."
  );
  log.warn("", err);
}

// 'history' is passed by reference so it will be updated in the function

utils.setMatchingServersAndUpdateHistory(
  dependencies,
  history,
  new model.ServerEvent(Date.now(), artifact)
);

fs.writeFileSync(changelogFilePath, JSON.stringify(history, null, 2));
