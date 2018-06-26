"use strict";

const _ = require("lodash");
const path = require("path");
const log = require("npmlog");

const utils = require("../utils/utils");
const cst = require("../const");
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
  constructor(image, tag, ports) {
    this.image = image;
    this.tag = tag;
    this.ports = ports;
  }
}

/**
 * Describes a File TLS deployment section
 */
class FileTLSDeployment {
  constructor(privateKeyPath, publicCertPath, chainCertsPath) {
    this.privateKeyPath = privateKeyPath;
    this.publicCertPath = publicCertPath;
    this.chainCertsPath = chainCertsPath;
  }
}

/**
 * Describes a Vault TLS deployment section used to fetch TLS certs on a remote Vault server
 */
class VaultTLSDeployment {
  constructor(privateKeyURL, publicCertURL, chainCertsURL) {
    this.privateKeyURL = privateKeyURL;
    this.publicCertURL = publicCertURL;
    this.chainCertsURL = chainCertsURL;
  }
}

/**
 * Describes an Instance Data section
 *
 * Note: 'instanceUuid' and 'dataDir' should not be both provided. Instance validation would fail.
 */
class InstanceData {
  constructor(instanceUuid, dataDir) {
    this.uuid = instanceUuid;
    this.dataDir = dataDir;
  }
}

/**
 * Describes a SQL Data section
 */
class SqlData {
  constructor(engine, database, sourceFile) {
    this.engine = engine;
    this.database = database;
    this.sourceFile = sourceFile;
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
  /**
   * @return model.Script()
   */
  getBuildScript() {
    return cst.ABSTRACT;
  }
  /**
   * @param {Object} args - Eg. getArtifact({ pom: ..., commitMetadata: ...})
   *  'grep' for invocations the code base to identify possible properties for args.
   *
   * @return model.Artifact()
   */
  getArtifact(args) {
    return cst.ABSTRACT;
  }
  /**
   * @return model.Script()
   */
  getDeployScript(artifact) {
    return cst.ABSTRACT;
  }
  /**
   * @param {Object} args - Eg. postBuildActions({ pom: ..., artifactIds: ...})
   *  'grep' for invocations in the code base to identify possible properties for args.
   */
  postBuildActions(args) {
    return "true";
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
  InstanceData: InstanceData,
  SqlData: SqlData,
  DockerDeployment: DockerDeployment,
  FileTLSDeployment: FileTLSDeployment,
  VaultTLSDeployment: VaultTLSDeployment,
  Artifact: Artifact,
  ProjectBuild: ProjectBuild,
  Descriptor: Descriptor,
  ServerEvent: ServerEvent
};
