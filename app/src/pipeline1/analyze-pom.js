/**
 *
 */

"use strict";

const log = require("npmlog");
const XML = require("pixl-xml");

const cst = require("../const");
const config = require(cst.CONFIGPATH);

var projectType = process.env[config.varProjectType()];
if (projectType !== "distribution") {
  log.info(
    "",
    "POM analyses and post-processing only happen for 'distribution' project types."
  );
  log.info("", "Current project type: '" + projectType + "'");
  process.exit();
}

var parsedPom = XML.parse(process.env[config.varPomFileContent()]);

console.log(JSON.stringify(parsedPom, null, 2));
