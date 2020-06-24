"use strict";

const path = require("path");
const log = require("npmlog");
const _ = require("lodash");
const cst = require("../const.js");

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
  varPropertiesChanges: function() {
    return "propertiesChanges";
  },
  varCreation: function() {
    return "creation";
  },
  varRepoUrl: function() {
    return "repoUrl";
  },
  varBranchName: function() {
    return "branchName";
  },
  varCommitId: function() {
    return "commitId";
  },
  varArtifactsDeployment: function() {
    return "artifactsDeployment";
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
    return process.env.APP_DATA_DIR_PATH; // this must exist as a global property within Jenkins
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
  getGradleBuildPomPath: function() {
    return path.resolve(process.env.WORKSPACE, "generated-pom.xml");
  },
  getTempDirPath: function() {
    return "/tmp";
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
  getFilterEventsJsScriptName: function() {
    return "filter-events.js";
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
  getFetchInstanceDefJsScriptName: function() {
    return "fetch-instance-def.js";
  },
  getFetchInstanceDefScriptName: function() {
    return "fetch-instance-def.sh";
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
  getMaintenanceOnJsScriptName: function() {
    return "maintenance-on.js";
  },
  getMaintenanceOnScriptName: function() {
    return "set-maintenance-on.sh";
  },
  getMaintenanceOnStatusCode: function() {
    return "3";
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
  getPostStartJsScriptName: function() {
    return "post-start.js";
  },
  getPostStartScriptName: function() {
    return "post-start.sh";
  },
  getPostStartStatusCode: function() {
    return "7";
  },
  getStartupMonitoringJsScriptName: function() {
    return "startup-monitoring.js";
  },
  getStartupMonitoringScriptName: function() {
    return "startup-monitoring.sh";
  },
  getStartupMonitoringStatusCode: function() {
    return "6";
  },
  getMaintenanceOffJsScriptName: function() {
    return "maintenance-off.js";
  },
  getMaintenanceOffScriptName: function() {
    return "set-maintenance-off.sh";
  },
  getMaintenanceOffStatusCode: function() {
    return "8";
  },
  getUpdateStatusJsScriptName: function() {
    return "update-status.js";
  },
  getProjectBuildEnvvarsName: function() {
    return "environment.env";
  },
  getProjectBuildEnvvarsPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getProjectBuildEnvvarsName()
    );
  },
  getJobBuildDetailsEnvvarsName: function() {
    return "build_details.env";
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
  getFilteredInstancesEventsFileName: function() {
    return "filtered_instances_events.json";
  },
  getFilteredInstancesEventsJsonPath: function() {
    return path.resolve(
      module.exports.getBuildDirPath(),
      module.exports.getFilteredInstancesEventsFileName()
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
  /**
   * The path whereto docker projects are copied on the CD server.
   */
  getCDDockerDirPath: function(instanceUuid) {
    return path.resolve(process.env.WORKSPACE, instanceUuid, "docker");
  },
  /**
   * The path whereto artifacts of an instance are fetched on the CD server.
   */
  getCDArtifactsDirPath: function(instanceUuid) {
    return path.resolve(process.env.WORKSPACE, instanceUuid, "artifacts");
  },
  getJobNameForGitHubWebhook: function() {
    return "github-webhook";
  },
  getJobNameForInstanceEvent: function() {
    return "instance-event";
  },
  getJobNameForInstanceEventsCron: function() {
    return "instance-events-cron";
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
    return ["debug", "dev", "staging", cst.INSTANCETYPE_PROD];
  },
  getInstanceDeploymentTypes: function() {
    return ["docker", "dockerMonolith", "dockerCompose"];
  },
  getInstanceArtifactsTypes: function() {
    return ["maven"];
  },
  /**
   * Possible aliases to use in an instance definition, and their mapped value
   */
  getInstanceDefinitionAliasesMap: function(instanceDef) {
    return {
      uuid: instanceDef.uuid,
      name: instanceDef.name
    };
  },
  getInstanceEventsProperties: function() {
    return ["uuid", "name", "type", "artifacts"];
  },
  getStatusFileName: function() {
    return "status.json";
  },
  /**
   * The environment variable that stores secrets
   */
  getSecretsEnvVar: function() {
    return "SECRETS";
  },
  /**
   * Fetches raw JSON secrets array from the environment and returns a consolidated secret object where all array entries have been merged into one single object.
   * The merge strategy is that the 'n' index element of the array will be replaced by 'n+1'
   *
   *  Eg: [ {"username": "root", "password": "default"} , { "password": "765EGrgfv65" } ]
   *     returns:
   *      [ {"username": "root", "password": "765EGrgfv65" } ]
   */
  getSecrets: function() {
    const rawSecretsArray = process.env[module.exports.getSecretsEnvVar()];
    var consolidatedSecrets = {};
    if (_.isEmpty(rawSecretsArray)) {
      log.error(
        "",
        "Trying to retrieve secrets from an 'undefined' raw secrets array. Did you correctly inject the environment at the pipeline 'stage' level?"
      );
    } else {
      var secrets = JSON.parse(rawSecretsArray);
      secrets.forEach(function(item) {
        consolidatedSecrets = Object.assign(consolidatedSecrets, item);
      });
    }
    return consolidatedSecrets;
  }
};
