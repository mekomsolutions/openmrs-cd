"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");
const XML = require("pixl-xml");
const _ = require("lodash");

const model = require("../../utils/model");
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
      var artifactKey = utils.toArtifactKey(
        args.pom.groupId,
        args.pom.artifactId,
        args.pom.version
      );
      //  Saving/updating the list of dependencies in the database.
      log.info("Saving/updating the list of dependencies in the database.")
      db.saveArtifactDependencies(
        artifactKey,
        utils.parseDependencies(args.pom)
      );

      //  Keeping track of the params of the latest built job (so, the current one).
      db.saveArtifactBuildParams(
        artifactKey,
        utils.getBuildParams(process.env, config)
      );

      cmns.mavenPostBuildActions(
        args.pom.groupId,
        args.artifactsIds,
        args.pom.version
      );
    };

    return projectBuild;
  }
};
