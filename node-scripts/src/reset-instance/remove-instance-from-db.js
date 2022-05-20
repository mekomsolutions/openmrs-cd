"use strict";

/**
 * Main script of the 'host preparation' stage.
 *
 */

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const log = require("npmlog");

const utils = require("../utils/utils");
const model = require("../utils/model");
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);

const scripts = require("../pipeline3/scripts");
const currentStage = config.getHostPrepareStatusCode();

//
//  Fetching the instance definition based on the provided UUID
//
var instanceDef = db.getInstanceDefinition(
  process.env[config.varInstanceUuid()]
);
if (_.isEmpty(instanceDef)) {
  throw new Error("Illegal argument: empty or unexisting instance definition.");
}

console.log("Deleting instance from database");
db.deleteInstanceDefinition(instanceDef.uuid);
