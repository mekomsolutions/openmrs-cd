"use strict";

const fs = require("fs");
const path = require("path");

const model = require(path.resolve("src/models/model"));
const utils = require(path.resolve("src/utils/utils"));

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

    projectBuild.getArtifact = function(pomDirPath, commitMetadata) {
      return cmns.getMavenProjectArtifact(pomDirPath, "./target", "zip");
    };

    return projectBuild;
  }
};
