"use strict";

const fs = require("fs");
const path = require("path");

const model = require("../../models/model");
const utils = require("../../utils/utils");

const cmns = require("../commons");

const thisType = "openmrsmodule";

module.exports = {
  getInstance: function() {
    var projectBuild = new model.ProjectBuild();

    projectBuild.getBuildScript = function() {
      return cmns.getMavenProjectBuildScript(thisType);
    };

    projectBuild.getDeployScript = function(artifact) {
      return cmns.getMavenProjectDeployScript(
        thisType,
        "ARTIFACT_UPLOAD_URL_" + thisType
      );
    };

    projectBuild.getArtifact = function(pomDirPath, commitMetadata) {
      return cmns.getMavenProjectArtifact(pomDirPath, "./omod/target", "omod");
    };

    projectBuild.postBuildActions = function() {
      cmns.postBuildActions();
    };

    return projectBuild;
  }
};
