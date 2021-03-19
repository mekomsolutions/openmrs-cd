"use strict";

const fs = require("fs");
const path = require("path");

const model = require("../../utils/model");
const utils = require("../../utils/utils");

const cmns = require("../commons");

const thisType = "initializer";
const nexusType = "openmrsmodule";

module.exports = {
  getInstance: function() {
    var projectBuild = new model.ProjectBuild();

    projectBuild.getBuildScript = function() {
      var script = cmns.getMavenProjectBuildScript(thisType);

      script.body = "mvn clean package -P validator\n";

      return script;
    };

    projectBuild.getDeployScript = function(artifact) {
      return cmns.getMavenProjectDeployScript(
        thisType,
        "ARTIFACT_UPLOAD_URL_" + nexusType
      );
    };

    projectBuild.getArtifact = function(args) {
      return cmns.getMavenProjectArtifact(args.pom, "./omod/target", "omod");
    };

    projectBuild.postBuildActions = function(args) {
      cmns.mavenPostBuildActions(
        args.pom.groupId,
        args.artifactsIds,
        args.pom.version
      );
    };

    return projectBuild;
  }
};
