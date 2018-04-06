"use strict";

const _ = require("lodash");
const path = require("path");

const utils = require(path.resolve("src/utils/utils"));
const cst = require(path.resolve("src/const"));
const config = require(cst.CONFIGPATH);

/**
 * An object that describes the script to build the project
 *
 */
class Script {
  constructor(type, headComment, body) {
    this.type = type;
    this.headComment = headComment;
    this.body = body;
  }
}

/**
 * Describes a Docker deployment
 */
class DockerDeployment {
  constructor(version) {
    this.version = version;
    // TODO: Align this implementation to what we settled on in our test resources.
  }
}

/**
 * Describes a Maven project
 */
class MavenProject {
  constructor(groupId, artifactId, version, packaging) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.version = version;
    this.packaging = packaging;
  }
}

/**
 * Describes a build artifact.
 */
class Artifact {
  constructor(
    mavenProject,
    name,
    version,
    buildPath,
    filename,
    extension,
    destFilename
  ) {
    this.mavenProject = mavenProject;
    this.name = name;
    this.version = version;
    this[config.varBuildPath()] = buildPath;
    this[config.varFilename()] = filename;
    this.extension = extension;
    this[config.varDestFilename()] = destFilename;
  }
}

/**
 * An object that represents a source code project to be built and deployed.
 * This is an interface to document which field should be implemented when creating a new project type.
 *
 */
class ProjectBuild {
  getBuildScript() {
    return cst.ABSTRACT;
  }
  getArtifact(pomPath, commitMetadata) {
    return cst.ABSTRACT;
  }
  getDeployScript(artifact) {
    return cst.ABSTRACT;
  }
}

/**
 * Represents a server (an OpenMRS distro + ref) (such as a pom.xml file).
 */
class Descriptor {
  constructor(serverId, rawData) {
    this.serverId = serverId;
    this.rawData = rawData;
  }
  getDependencies() {
    return cst.ABSTRACT;
  }
}

/**
 * Represents an event to be logged in the history of a server.
 */
class ServerEvent {
  constructor(timestamp, artifact) {
    (this.timestamp = timestamp), (this.artifact = artifact);
  }
}

module.exports = {
  Script: Script,
  MavenProject: MavenProject,
  DockerDeployment: DockerDeployment,
  Artifact: Artifact,
  ProjectBuild: ProjectBuild,
  Descriptor: Descriptor,
  ServerEvent: ServerEvent
};
