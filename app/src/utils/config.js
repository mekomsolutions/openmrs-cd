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
    return "instanceUuid";
  },
  varInstanceName: function() {
    return "instanceName";
  },
  varArtifactsChanges: function() {
    return "artifactsChanges";
  },
  varDeploymentChanges: function() {
    return "deploymentChanges";
  },
  varDataChanges: function() {
    return "dataChanges";
  },
  varCreation: function() {
    return "creation";
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
  varInstanceEvent: function() {
    return "instanceEvent";
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
  varStatus: function() {
    return "status";
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
  getInstanceEventJsScriptName: function() {
    return "validate-instance.js";
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
  getPrehostPrepareJsScriptName: function() {
    return "prehost-preparation.js";
  },
  getPrehostPrepareScriptName: function() {
    return "prehost-prepare.sh";
  },
  getPrehostPrepareStatusCode: function() {
    return "1";
  },
  getHostPrepareJsScriptName: function() {
    return "host-preparation.js";
  },
  getHostPrepareScriptName: function() {
    return "host-prepare.sh";
  },
  getHostPrepareStatusCode: function() {
    return "2";
  },
  getStartInstanceJsScriptName: function() {
    return "start-instance.js";
  },
  getStartInstanceScriptName: function() {
    return "start-instance.sh";
  },
  getStartInstanceStatusCode: function() {
    return "5";
  },
  getUpdateStatusJsScriptName: function() {
    return "update-status.js";
  },
  getProjectBuildTriggerEnvvarsName: function() {
    return "trigger.env";
  },
  getProjectBuildTriggerEnvvarsPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getProjectBuildTriggerEnvvarsName()
    );
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
  /**
   * The path whereto artifacts of an instance are fetched on the CD server.
   */
  getCDArtifactsDirPath: function(instanceUuid) {
    return path.resolve(process.env.WORKSPACE, instanceUuid, "artifacts");
  },

  getJobNameForWebhook: function() {
    return "webhook";
  },
  getJobNameForInstanceEvent: function() {
    return "instance-event";
  },
  getJobNameForPipeline1: function() {
    return "pipeline1";
  },
  getJobNameForPipeline3: function() {
    return "pipeline3";
  },

  getInstanceVersions: function() {
    return ["1.0.0"];
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
  /**
   * Possible aliases to use in an instance definition, and their mapped value
   */
  getInstanceDefinitionAliasesMap: function(instanceDef) {
    return {
      uuid: instanceDef.uuid
    };
  },

  getInstanceEventsProperties: function() {
    return ["uuid", "name", "type", "artifacts"];
  },
  getStatusFileName: function() {
    return "status.json";
  }
};
