/**
 *
 */

"use strict";

const log = require("npmlog");
const XML = require("pixl-xml");
const _ = require("lodash");

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);
const model = require("../models/model");
const utils = require("../utils/utils");

//
//  Assessing the project type.
//
var projectType = process.env[config.varProjectType()];
if (projectType !== "distribution") {
  log.info(
    "",
    "POM analysis and post-processing only happen for 'distribution' project types."
  );
  log.info("", "Current project type: '" + projectType + "'");
  process.exit();
}

//
//  Keeping track of the params of the latest built job (the current one).
//
var buildJobParams = _.pick(process.env, [
  config.varProjectType(),
  config.varRepoUrl(),
  config.varRepoName(),
  config.varBranchName()
]);

//
// Default POM parsing.
//
var parsedPom = XML.parse(process.env[config.varPomFileContent()]);

//
//  Building the list of dependencies (as artifact keys).
//
var deps = [];
parsedPom.dependencies.dependency.forEach(function(dep) {
  var propKey = dep.version.substring(2).slice(0, -1); // "${foo.version}" -> "foo.version"

  var propVal = parsedPom.properties[propKey];
  if (!_.isUndefined(propVal)) {
    // substituting the version alias, if any
    dep.version = propVal;
  }

  var mavenProject = new model.MavenProject(
    dep.groupId,
    dep.artifactId,
    dep.version
  );
  deps.push(mavenProject.asArtifactKey());
});

//
//  Saving/updating the list of dependencies in database.
//
var project = new model.MavenProject(
  parsedPom.groupId,
  parsedPom.artifactId,
  parsedPom.version
);
db.saveArtifactDependencies(project.asArtifactKey(), deps, buildJobParams);
