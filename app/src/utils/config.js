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
  varBuild: function() {
    return "build";
  },
  varDeploy: function() {
    return "deploy";
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

  getTempDirPath: function() {
    return "/tmp";
  },
  getCommitMetadataFilePath: function() {
    return "/tmp/commit_metadata.json";
  },
  getCommitMetadataFileEnvvarsPath: function() {
    return "/tmp/commit_metadata.env";
  },
  getProjectBuildTriggerEnvvarsName: function() {
    return "trigger.env";
  },
  getWebhookTriggersFilePath: function() {
    return "/usr/share/jenkins/webhook_triggers.json";
  },
  getArtifactEnvvarsPath: function() {
    return "/tmp/artifact.env";
  },
  getArtifactRepoEnvvarsName: function() {
    return "artifact_repository.env";
  }
};
