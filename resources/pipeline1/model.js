module.exports = {

  BuildScript: function (type, comments, buildScript) {
    this.scriptType = type;
    this.comments = comments
    this.buildProject = buildScript;
  },

  /**
  *
  * An object that represents a source code project 
  * This is an interface and each field should be implemented for each type of project
  *
  */
  Project: function (artifact) {
    this.getBuildScript = function () {
      return "This method is not implemented. Please provide an implementation."
    }
    this.getBuildScriptAsString = function () {
      return "This method is not implemented. Please provide an implementation."
    }
    this.getArtifact = function  () {
      return "This method is not implemented. Please provide an implementation."
    }
    
  },

  Artifact: function(path, name, extension, version) {
    this.path = path;
    this.name = name;
    this.extension = extension;
    this.version = version;
  }

}