/**
 *
 */

"use strict";

const cst = require("../const");
const config = require(cst.CONFIGPATH);

var projectType = process.env[config.varProjectType()];

var projectBuild = require("./impl/" +
  process.env[config.varProjectType()]).getInstance();

projectBuild.postBuildActions();
