var utils = require('../utils/utils')

/**
* An object that describes the script to build the project
*
*/
var Script = function (type, comments, script) {
  this.type = type;
  this.comments = comments
  this.value = script;
}

/**
* An object that describes the artifact that will be built
*
*/
var Artifact = function(path, name, module, groupId, extension, version, filename, destFilename) {
  this.path = path
  this.name = name
  this.modules = module
  this.groupId = groupId
  this.extension = extension
  this.version = version
  this.filename = filename
  this.destFilename = destFilename
}

/**
* An object that represents a source code project to be built and deployed.
* This is an interface to document which field should be implemented when creating a new project type.
*
*/
var Project = function () {
  this.getBuildScript = function () {
    return new Script()
  }
  this.getBuildScriptAsString = function () {
  // A default implementation is provided
    return utils.getScriptAsString(this.getBuildScript())
  }
  this.getArtifact = function  () {
    return new Artifact()
  }  
  this.getDeployScript = function (artifact) {
    return new Script()
  }
  this.getDeployScriptAsString = function (artifact) {
  // A default implementation is provided
    return utils.getScriptAsString(this.getDeployScript(artifact))
  }
}

/**
* An object that represents a dependency.
*
*/
var Dependency = function (groupId, artifactId, version) {
  this.groupId = groupId
  this.artifactId = artifactId
  this.version = version
}

/**
* An object that represents all the dependencies of a given server.
*
*/
var Dependencies = function (dependencies) {
  this.dependencies = dependencies
}
/**
* An object that represents an given server (an OpenMRS distro + ref) (such as a pom.xml file).
*
*/
var Descriptor = function (serverId, rawData) {
  this.serverId = serverId
  this.rawData = rawData
  this.getDependencies = function () {
    return new Dependencies()
  }
}
/**
* An object that represents an event to be logged in the history of a server.
*
*/
var ServerEvent = function (timestamp, artifact) {
  this.timestamp = timestamp
  this.artifact = artifact
}

module.exports = {
  "Script": Script,
  "Artifact": Artifact,
  "Project": Project,
  "Dependency": Dependency,
  "Dependencies": Dependencies,
  "Descriptor": Descriptor,
  "ServerEvent": ServerEvent
}

