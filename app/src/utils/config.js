"use strict";

const path = require("path");
const _ = require("lodash");

/**
 * Configuration API, typically to specify files or dirs locations.
 */

module.exports = {
  //
  // The vars below are used to define model fields members names that
  // are explictly referenced in Jenkins jobs files (eg. in .jenkinsfile and config.xml)
  //
  varPayload: function() {
    return "payload";
  },
  varProjectType: function() {
    return "projectType";
  },
  varScmService: function() {
    return "scmService";
  },
  varDownstreamJob: function() {
    return "downstream_job";
  },
  varInstanceUuid: function() {
    return "instance_uuid";
  },
  varArtifactsChanges: function() {
    return "artifacts_changes";
  },
  varDeploymentChanges: function() {
    return "deployment_changes";
  },
  varDataChanges: function() {
    return "data_changes";
  },
  varRepoUrl: function() {
    return "repoUrl";
  },
  varRepoName: function() {
    return "repoName";
  },
  varBranchName: function() {
    return "branchName";
  },
  varCommitId: function() {
    return "commitId";
  },
  varBuildPath: function() {
    return "buildPath";
  },
  varDestFilename: function() {
    return "destFilename";
  },
  varFilename: function() {
    return "filename";
  },
  varBuildName: function() {
    return "build_name";
  },
  varBuildDesc: function() {
    return "build_desc";
  },
  varEnvvarBuildPath: function() {
    return "BUILD_PATH";
  },

  /**
   * The app data dir is where persistent data should be kept.
   * Whether it is actual data or configuration files.
   */
  getAppDataDirPath: function() {
    return process.env.APP_DATA_DIR_PATH; // this must be exist as a global property within Jenkins
  },
  getArtifactIdListFileName: function() {
    return "artifacts_ids.txt";
  },
  getArtifactIdListFilePath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getArtifactIdListFileName()
    );
  },
  getRelativeBuildDirPath: function() {
    return (
      "jobs" +
      "/" +
      process.env.JOB_NAME +
      "/" +
      "builds" +
      "/" +
      process.env.BUILD_NUMBER
    );
  },
  getBuildDirPath: function() {
    // https://stackoverflow.com/a/48712627/321797
    if (_.isEmpty(process.env[module.exports.varEnvvarBuildPath()])) {
      return path.resolve(
        process.env.JENKINS_HOME,
        module.exports.getRelativeBuildDirPath()
      );
    } else {
      return process.env[module.exports.varEnvvarBuildPath()];
    }
  },
  getBuildPomPath: function() {
    return path.resolve(process.env.WORKSPACE, "pom.xml");
  },
  getTempDirPath: function() {
    return "/tmp";
  },
  getWebhookJsScriptPath: function() {
    // relative to /app/src
    return "webhook/webhook.js";
  },
  getTriggerJsScriptPath: function() {
    // relative to /app/src
    return "webhook/trigger.js";
  },
  getCommitMetadataFilePath: function() {
    return path.resolve(
      module.exports.getTempDirPath(),
      "commit_metadata.json"
    );
  },
  getCommitMetadataFileEnvvarsPath: function() {
    return path.resolve(module.exports.getTempDirPath(), "commit_metadata.env");
  },
  getBuildJsScriptName: function() {
    return "build.js";
  },
  getPostBuildJsScriptName: function() {
    return "downstream-builds.js";
  },
  getIdentifyInstancesJsScriptName: function() {
    return "identify-instances.js";
  },
  getBuildShellScriptName: function() {
    return "build.sh";
  },
  getBuildShellScriptPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getBuildShellScriptName()
    );
  },
  getDeployShellScriptName: function() {
    return "deploy.sh";
  },
  getDeployShellScriptPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getDeployShellScriptName()
    );
  },
  getPrehostPrepareScriptName: function() {
    return "prehost-prepare.sh";
  },
  getProjectBuildTriggerEnvvarsName: function() {
    return "trigger.env";
  },
  getJobBuildDetailsEnvvarsName: function() {
    return "build_details.env";
  },
  getWebhookTriggersFilePath: function() {
    return "/usr/share/jenkins/webhook_triggers.json";
  },
  getBuildArtifactEnvvarsName: function() {
    return "artifact.env";
  },
  getBuildArtifactEnvvarsPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getBuildArtifactEnvvarsName()
    );
  },
  getBuildArtifactJsonPath: function() {
    return path.resolve(module.exports.getBuildDirPath(), "artifact.json");
  },
  getDownstreamBuildParamsJsonName: function() {
    return "builds_params.json";
  },
  getDownstreamBuildParamsJsonPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getDownstreamBuildParamsJsonName()
    );
  },
  getArtifactRepoEnvvarsName: function() {
    return "artifact_repository.env";
  },
  getJenkinsHomePath: function() {
    // $JENKINS_HOME
    return "/var/jenkins_home";
  },
  getInstancesConfigFileName: function() {
    return "instances.json";
  },
  getInstancesConfigPath: function() {
    return path.resolve(
      module.exports.getAppDataDirPath(),
      module.exports.getInstancesConfigFileName()
    );
  },
  getInstancesEventsDbPath: function() {
    return path.resolve(
      module.exports.getAppDataDirPath(),
      "instances_events.json"
    );
  },
  getArtifactsBuildParamsDbFileName: function() {
    return "artifacts_build_params.json";
  },
  getArtifactsBuildParamsDbPath: function() {
    return path.resolve(
      module.exports.getAppDataDirPath(),
      module.exports.getArtifactsBuildParamsDbFileName()
    );
  },
  getArtifactDependenciesConfigFileName: function() {
    return "artifacts_dependencies.json";
  },
  getArtifactDependenciesConfigPath: function() {
    return path.resolve(
      module.exports.getAppDataDirPath(),
      module.exports.getArtifactDependenciesConfigFileName()
    );
  },
  getBuildJsScriptName: function() {
    return "build.js";
  },
  getCDArtifactsDirPath: function(instanceUuid) {
    return path.resolve(
      module.exports.getAppDataDirPath(),
      instanceUuid,
      "artifacts"
    );
  },

  getJobNameForWebhook: function() {
    return "webhook";
  },
  getJobNameForPipeline1: function() {
    return "pipeline1";
  },
  getJobNameForPipeline3: function() {
    return "pipeline3";
  },

  getInstanceTypes: function() {
    return ["debug", "dev", "staging", "prod"];
  },
  getInstanceDeploymentTypes: function() {
    return ["docker"];
  },
  getInstanceArtifactsTypes: function() {
    return ["maven"];
  },

  getInstanceEventsProperties: function() {
    return ["uuid", "name", "type", "artifacts"];
  }
};
