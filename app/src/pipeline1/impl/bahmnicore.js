"use strict";

const fs = require("fs");
const path = require("path");

const model = require("../../models/model");
const utils = require("../../utils/utils");

const cmns = require("../commons");

const thisType = "bahmnicore";
const nexusType = "openmrsmodule";

module.exports = {
  getInstance: function() {
    var projectBuild = new model.ProjectBuild();

    projectBuild.getBuildScript = function() {
      var script = cmns.getMavenProjectBuildScript(thisType);

      script.body = "mvn clean install -P IT\n";

      return script;
    };

    projectBuild.getDeployScript = function(artifact) {
      return cmns.getMavenProjectDeployScript(
        thisType,
        "ARTIFACT_UPLOAD_URL_" + nexusType
      );
    };

    projectBuild.getArtifact = function(args) {
      var artifact = cmns.getMavenProjectArtifact(
        args.pom,
        "./bahmnicore-omod/target",
        "omod"
      );

      artifact.name = "bahmnicore";
      artifact.filename =
        artifact.name + "-" + artifact.version + "." + artifact.extension;
      artifact.destFilename = artifact.filename;

      return artifact;
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
