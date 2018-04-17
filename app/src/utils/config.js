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
    if (_.isEmpty(process.env.BUILD_PATH)) {
      return path.resolve(
        process.env.JENKINS_HOME,
        module.exports.getRelativeBuildDirPath()
      );
    } else {
      return process.env.BUILD_PATH;
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
  getBuildShellScriptName: function() {
    return "build.sh";
  },
  getDeployShellScriptName: function() {
    return "deploy.sh";
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
  getChangedArtifactEnvvarsPath: function() {
    return path.resolve(module.exports.getTempDirPath(), "artifact.env");
  },
  getChangedArtifactJsonPath: function() {
    return path.resolve(module.exports.getTempDirPath(), "artifact.json");
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
  getServersConfigPath: function() {
    // relative to Jenkins home
    return "servers.json";
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
  getFetchServersDescriptorsJsScriptName: function() {
    return "fetch.js";
  },
  getParseServersDescriptorsJsScriptName: function() {
    return "parse.js";
  },
  getServersDescriptorsPath: function() {
    return path.resolve(module.exports.getTempDirPath(), "descriptors.json");
  },
  getUpdateServerChangelogJsScriptName: function() {
    return "compare.js";
  },
  getServersChangelogPath: function() {
    // relative to Jenkins home
    return "history.json";
  },
  getServersByArtifactKeysPath: function() {
    return path.resolve(module.exports.getTempDirPath(), "dependencies.json");
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
  getJobNameForPipeline2: function() {
    return "pipeline2";
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
  }
};
