"use strict";

const fs = require("fs");
const _ = require("lodash");
const log = require("npmlog");

const utils = require("../utils/utils");
const model = require("../utils/model");
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

var stage = "";
stage = process.env[config.varStatus()];

if (_.isEmpty(stage)) {
  log.error(
    "",
    "'Stage' value is empty. Instance definition status can not be saved"
  );
  throw new Error(
    "Illegal argument: unable to set an empty status for the instance."
  );
}
instanceDef.status = stage;
db.saveInstanceDefinition(instanceDef);
log.info("", "Set instance status to '" + stage + "'");
