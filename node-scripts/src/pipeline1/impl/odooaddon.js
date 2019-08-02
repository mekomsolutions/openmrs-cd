"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");
const _ = require("lodash");

const model = require("../../utils/model");
const utils = require("../../utils/utils");
const config = require("../../utils/config");

const cmns = require("../commons");

const thisType = "odooaddon";

module.exports = {
  getInstance: function() {
    var projectBuild = new model.ProjectBuild();

    projectBuild.getBuildScript = function() {
      return cmns.getGradleProjectBuildScript(thisType);
    };

    projectBuild.getDeployScript = function(artifact) {
      return cmns.getGradleProjectDeployScript(
        thisType,
        "ARTIFACT_UPLOAD_URL_" + thisType
      );
    };

    projectBuild.getArtifact = function(args) {
      if (_.isEmpty(args.pom)) {
        log.info(
          "",
          "Using Gradle-generated POM file located at: " +
            config.getGradleBuildPomPath()
        );
        args.pom = utils.getPom(path.resolve(config.getGradleBuildPomPath()));
      }
      return cmns.getMavenProjectArtifact(args.pom, "build", "zip");
    };

    projectBuild.postBuildActions = function(args) {
      if (_.isEmpty(args.pom)) {
        log.info(
          "",
          "Using Gradle-generated POM file located at: " +
            config.getGradleBuildPomPath()
        );
        args.pom = utils.getPom(path.resolve(config.getGradleBuildPomPath()));
      }
      cmns.mavenPostBuildActions(
        args.pom.groupId,
        [args.pom.artifactId],
        args.pom.version
      );
    };

    return projectBuild;
  }
};
