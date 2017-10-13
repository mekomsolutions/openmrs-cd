var model = require('./model')
var utils = require('../utils/utils')
var fs = require('fs')

module.exports = {

  getInstance: function() {

    var openmrsModule = new model.Project();

    // Implement here the Project object methods
    openmrsModule.getBuildScriptAsString = function () {
      return getBuildScriptAsString();
    }
    openmrsModule.getBuildScript = function () {
      return getBuildScript();
    }
    openmrsModule.getArtifact = function () {
      var artifact = new model.Artifact();

      artifact.extension = "omod"
      artifact.path = "./omod/target"

      var pom = utils.getPom();
      artifact.version = pom.version
      artifact.name = pom.artifactId

      return artifact
    }

    return openmrsModule
  } 
}

var getBuildScript = function() {

  var buildScript = new model.BuildScript();

  buildScript.type = "#!/bin/bash"
  buildScript.comments = "# Autogenerated script to build 'openmrsmodule' type of projects"
  buildScript.value = "mvn clean install\n"

  return buildScript    
}

var getBuildScriptAsString = function() {

  var buildScript = getBuildScript()

  var string = ""

  string = buildScript.type
  string = string + "\n\n"
  string = string + buildScript.comments
  string = string + "\n\n"
  string = string + buildScript.value

  return string
}

