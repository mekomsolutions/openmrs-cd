"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const log = require("npmlog");

const cst = require("../../const");
const model = require("../../utils/model");
const utils = require("../../utils/utils");

const cmns = require("../commons");
const config = require("../../utils/config");
const db = require(cst.DBPATH);

const thisType = "default";
module.exports = {
  getInstance: function() {
    var projectBuild = new model.ProjectBuild();

    var ocd3Yaml = utils.convertYaml(config.getOCD3YamlFilePath());

    projectBuild.getBuildScript = function() {
      return getBuildScript(ocd3Yaml);
    };

    projectBuild.getDeployScript = function(artifact) {
      return getDeployScript(artifact, ocd3Yaml);
    };

    projectBuild.getArtifact = function(args) {
      if (!_.isEmpty(args.pom)) {
        var artifact = cmns.getMavenProjectArtifact(args.pom, null, null);
        return artifact;
      } else {
        var artifact = ocd3Yaml.deploy.artifact;

        var _default = {
          groupId: "net.mekomsolutions",
          version: args.commitMetadata.branchName
            ? args.commitMetadata.branchName
            : (artifact.version = args.commitMetadata.commitId),
          artifactId: args.commitMetadata.repoName
        };

        artifact = { ..._default, ...artifact };

        // encapsulating the Maven project
        var mavenProject = new model.MavenProject();
        mavenProject.groupId = artifact.groupId;
        mavenProject.artifactId = artifact.artifactId;
        mavenProject.version = artifact.version;
        // 'packaging' is not needed in any further step. Dropping support.
        mavenProject.packaging = null;
        artifact.mavenProject = mavenProject;

        return artifact;
      }
    };

    projectBuild.postBuildActions = function(args) {
      // Verify if a pom is provided (ie, is a Maven project)
      if (!_.isEmpty(args.pom)) {
        // Verify if "rebuildOnDependencyChanges" is set or not. If so, parse and save dependencies to later rebuild, when neeeded.
        if (
          !_.isEmpty(ocd3Yaml.rebuildOnDependencyChanges) &&
          ocd3Yaml.rebuildOnDependencyChanges
        ) {
          log.info("'rebuildOnDependencyChanges' is set to 'true'. Saving/updating the list of dependencies in the database.")
          var artifactKey = utils.toArtifactKey(
            args.pom.groupId,
            args.pom.artifactId,
            args.pom.version
          );
          //  Saving/updating the list of dependencies in the database.
          db.saveArtifactDependencies(
            artifactKey,
            utils.parseDependencies(args.pom)
          );

          //  Keeping track of the params of the latest built job (so, the current one).
          db.saveArtifactBuildParams(
            artifactKey,
            utils.getBuildParams(process.env, config)
          );
        }

        cmns.mavenPostBuildActions(
          args.pom.groupId,
          args.artifactsIds,
          args.pom.version
        );
      } else {
        cmns.mavenPostBuildActions(
          args.pseudoPom.groupId,
          [args.pseudoPom.artifactId],
          args.pseudoPom.version
        );
      }
    };

    return projectBuild;
  }
};

var getBuildScript = function(ocd3Yaml) {
  var script = new model.Script();

  script.type = "#!/bin/bash";
  script.body = ocd3Yaml.build.bash_commands;
  script.headComment =
    "# Custom build instructions provided in '.ocd3.yml' file.";
  return script;
};

var getDeployScript = function(artifact, ocd3Yaml) {
  if (_.isUndefined(artifact)) {
    log.error(
      "",
      "An artifact parameter must be provided to construct the '" +
        thisType +
        "' deploy script."
    );
    throw new Error();
  }

  var script = new model.Script();

  script.type = "#!/bin/bash";
  script.body = ocd3Yaml.deploy.bash_commands;
  script.headComment =
    "# Custom deploy instructions provided in '.ocd3.yml' file.";
  return script;
};
