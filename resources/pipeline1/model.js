module.exports = {

  /**
  * An object that describes the script to build the project
  *
  */
  BuildScript: function (type, comments, buildScript) {
    this.scriptType = type;
    this.comments = comments
    this.buildProject = buildScript;
  },

  /**
  * An object that describes the artifcat that will be built
  *
  */
  Artifact: function(path, name, extension, version, filename) {
    this.path = path;
    this.name = name;
    this.extension = extension;
    this.version = version;
    this.filename = filename
  },

  /**
  * An object that represents a source code project 
  * This is an interface to document which field should be implemented when creating a new project type
  *
  */
  Project: function (artifact) {
    this.getBuildScript = function () {
      return new BuildScript()
    }
    this.getBuildScriptAsString = function () {
      return new String()
    }
    this.getArtifact = function  () {
      return new Artifact()
    }   
  }

}