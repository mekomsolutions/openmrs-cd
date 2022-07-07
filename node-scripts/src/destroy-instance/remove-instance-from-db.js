"use strict";

/**
 * Main script of the 'host preparation' stage.
 *
 */

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const log = require("npmlog");

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);

//
//  Fetching the instance definition based on the provided UUID
//
var instanceDef = db.getInstanceDefinition(
  process.env[config.varInstanceUuid()]
);
if (_.isEmpty(instanceDef)) {
  throw new Error("Illegal argument: empty or unexisting instance definition.");
}

log.info("Deleting instance from database");
db.deleteInstanceDefinition(instanceDef.uuid);
