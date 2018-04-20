"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");
const XML = require("pixl-xml");
const _ = require("lodash");

const model = require("../../models/model");
const utils = require("../../utils/utils");
const cst = require("../../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);
const cmns = require("../commons");

const thisType = "distribution";
const nexusType = "openmrsmodule"; // for now we park distributions artifacts in the same place as OpenMRS modules on Nexus

module.exports = {
  getInstance: function() {
    var projectBuild = new model.ProjectBuild();

    projectBuild.getBuildScript = function() {
      return cmns.getMavenProjectBuildScript(thisType);
    };

    projectBuild.getDeployScript = function(artifact) {
      return cmns.getMavenProjectDeployScript(
        thisType,
        "ARTIFACT_UPLOAD_URL_" + nexusType
      );
    };

    projectBuild.getArtifact = function(args) {
      return cmns.getMavenProjectArtifact(args.pom, "./target", "zip");
    };

    projectBuild.postBuildActions = function(args) {
      postBuildActions(args.pom);
    };

    return projectBuild;
  }
};

var postBuildActions = function(pom) {
  //
  //  Building the list of dependencies (as artifact keys).
  //
  var deps = [];
  pom.dependencies.dependency.forEach(function(dep) {
    var propKey = dep.version.substring(2).slice(0, -1); // "${foo.version}" -> "foo.version"

    var propVal = pom.properties[propKey];
    if (!_.isUndefined(propVal)) {
      // substituting the version alias, if any
      dep.version = propVal;
    }

    deps.push(utils.toArtifactKey(dep.groupId, dep.artifactId, dep.version));
  });

  var artifactKey = utils.toArtifactKey(
    pom.groupId,
    pom.artifactId,
    pom.version
  );

  //
  //  Saving/updating the list of dependencies in database.
  //
  db.saveArtifactDependencies(artifactKey, deps);

  //
  //  Keeping track of the params of the latest built job (the current one).
  //
  var buildJobParams = _.pick(process.env, [
    config.varProjectType(),
    config.varRepoUrl(),
    config.varRepoName(),
    config.varBranchName()
  ]);
  db.saveArtifactBuildParams(artifactKey, buildJobParams);
};
