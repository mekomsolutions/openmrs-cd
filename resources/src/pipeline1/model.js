var utils = require('../utils/utils')

module.exports = {

  /**
  * An object that describes the script to build the project
  *
  */
  Script: function (type, comments, script) {
    this.type = type;
    this.comments = comments
    this.value = script;
  },

  /**
  * An object that describes the artifact that will be built
  *
  */
  Artifact: function(path, name, groupId, extension, version, filename, destFilename) {
    this.path = path
    this.name = name
    this.groupId = groupId
    this.extension = extension
    this.version = version
    this.filename = filename
    this.destFilename = destFilename
  },

  /**
  * An object that represents a source code project to be built and deployed.
  * This is an interface to document which field should be implemented when creating a new project type.
  *
  */
  Project: function () {
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

}