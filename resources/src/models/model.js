'use strict'
var utils = require('../utils/utils')

/**
* An object that describes the script to build the project
*
*/
class Script {
  constructor (type, comments, script) {
    this.type = type;
    this.comments = comments
    this.value = script;
  }
}

/**
* An object that describes an artifact
*
*/
class Artifact {
  constructor (name, module, groupId, version) {
    this.name = name
    this.module = module
    this.groupId = groupId
    this.version = version
  }
}

/**
* An object that describes an artifact and its details as a file
*
*/
class ArtifactFile {
  constructor (name, module, groupId, version, path, extension, filename, destFilename) {
    this.name = name
    this.module = module
    this.groupId =groupId
    this.version = version
    this.path = path
    this.extension = extension
    this.filename = filename
    this.destFilename = destFilename
  }
}

/**
* An object that represents a source code project to be built and deployed.
* This is an interface to document which field should be implemented when creating a new project type.
*
*/
class Project {

  getBuildScript () {
    return "To be implemented"
  } 
  getBuildScriptAsString () {
    // A default implementation is provided
    return utils.getScriptAsString(this.getBuildScript())
  }
  getArtifactFile () {
    return "To be implemented"
  }  
  getDeployScript (artifact) {
    return "To be implemented"
  }
  getDeployScriptAsString (artifact) {
    // A default implementation is provided
    return utils.getScriptAsString(this.getDeployScript(artifact))
  }
}

/**
* An object that represents a dependency.
*
*/
class Dependency {
  constructor(groupId, artifactId, version) {
    this.groupId = groupId
    this.artifactId = artifactId
    this.version = version
  }
} 

/**
* An object that represents all the dependencies of a given server.
*
*/
class Dependencies {
  constructor (dependencies) {
    this.dependencies = dependencies
  }
} 
/**
* An object that represents an given server (an OpenMRS distro + ref) (such as a pom.xml file).
*
*/
class Descriptor {
  constructor (serverId, rawData) {
    this.serverId = serverId
    this.rawData = rawData
  }
  getDependencies () {
    return "To be implemented"
  }
}

/**
* An object that represents an event to be logged in the history of a server.
*
*/
class ServerEvent {
  constructor (timestamp, artifact) {
    this.timestamp = timestamp,
    this.artifact = artifact
  }
}

module.exports = {
  "Script": Script,
  "Artifact": Artifact,
  "ArtifactFile": ArtifactFile,
  "Project": Project,
  "Dependency": Dependency,
  "Dependencies": Dependencies,
  "Descriptor": Descriptor,
  "ServerEvent": ServerEvent
}