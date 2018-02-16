"use strict";
var utils = require("../utils/utils");
var constants = require("../constants/constants");

/**
 * An object that describes the script to build the project
 *
 */
class Script {
  constructor(type, comments, script) {
    this.type = type;
    this.comments = comments;
    this.value = script;
  }
}

/**
 * An object that describes an artifact
 *
 */
class Project {
  constructor(name, module, groupId, version) {
    this.name = name;
    this.module = module;
    this.groupId = groupId;
    this.version = version;
  }
}

/**
 * An object that describes an artifact and its details as a file
 *
 */
class Artifact {
  constructor(project, path, extension, filename, destFilename) {
    this.project = project;
    this.path = path;
    this.extension = extension;
    this.filename = filename;
    this.destFilename = destFilename;
  }
}

/**
 * An object that represents a source code project to be built and deployed.
 * This is an interface to document which field should be implemented when creating a new project type.
 *
 */
class ProjectBuild {
  getBuildScript() {
    return constants.ABSTRACT;
  }
  getBuildScriptAsString() {
    // A default implementation is provided
    return utils.getScriptAsString(this.getBuildScript());
  }
  getArtifact(pomPath, commitMetadata) {
    return constants.ABSTRACT;
  }
  getDeployScript(artifact) {
    return constants.ABSTRACT;
  }
  getDeployScriptAsString(artifact) {
    // A default implementation is provided
    return utils.getScriptAsString(this.getDeployScript(artifact));
  }
}

/**
 * An object that represents an given server (an OpenMRS distro + ref) (such as a pom.xml file).
 *
 */
class Descriptor {
  constructor(serverId, rawData) {
    this.serverId = serverId;
    this.rawData = rawData;
  }
  getDependencies() {
    return constants.ABSTRACT;
  }
}

/**
 * An object that represents an event to be logged in the history of a server.
 *
 */
class ServerEvent {
  constructor(timestamp, artifact) {
    (this.timestamp = timestamp), (this.artifact = artifact);
  }
}

module.exports = {
  Script: Script,
  Project: Project,
  Artifact: Artifact,
  ProjectBuild: ProjectBuild,
  Descriptor: Descriptor,
  ServerEvent: ServerEvent
};
