"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");
const _ = require("lodash");

const cst = require(path.resolve("src/const"));
const config = require(cst.CONFIGPATH);
const utils = require(path.resolve("src/utils/utils"));

module.exports = {
  getInstanceDefinition: function(uuid) {
    log.info("", "Fetching the instance definition with UUID: " + uuid);

    var instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    var instanceDef = utils.findInstanceInList(uuid, null, instances);

    if (_.isEmpty(instanceDef)) {
      log.warn("", "Instance definition not found in database.");
    }

    return instanceDef;
  }
};
