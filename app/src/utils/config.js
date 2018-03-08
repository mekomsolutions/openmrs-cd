"use strict";

/**
 * Configuration API, typically to specify files or dirs locations.
 */

module.exports = {
  //
  // The 'var's below are used to define model fields members names that
  // are explictly referenced in Jenkins jobs files (.jenkinsfile and config.xml)
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
    return "/tmp/commit_metadata.json";
  },
  getCommitMetadataFileEnvvarsPath: function() {
    return "/tmp/commit_metadata.env";
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
    return "/tmp/artifact.env";
  },
  getChangedArtifactJsonPath: function() {
    return "/tmp/artifact.json";
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
    return "/tmp/descriptors.json";
  },
  getUpdateServerChangelogJsScriptName: function() {
    return "compare.js";
  },
  getServersChangelogPath: function() {
    // relative to Jenkins home
    return "history.json";
  },
  getServersByArtifactKeysPath: function() {
    return "/tmp/dependencies.json";
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

  getInstanceDeploymentTypes: function() {
    return ["docker"];
  },
  getInstanceArtifactsTypes: function() {
    return ["maven"];
  }
};
