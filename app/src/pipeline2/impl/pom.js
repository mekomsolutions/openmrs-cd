var model = require('../../models/model')
var utils = require('../../utils/utils')
var fs = require('fs')
var XML = require('pixl-xml')

module.exports = {

  // Constructor function
  getInstance: function(serverId, pomAsXML) {

    var descriptor = new model.Descriptor(serverId, pomAsXML);

    descriptor.getDependencies = function() {
      var pomAsObject = XML.parse(this.rawData)

      // Fetch the version numbers from the XML
      var properties = pomAsObject.properties

      // Replace the version numbers in the rawPom directly
      var newPomAsXML = replaceVersionNumber(properties, this.rawData)
      pomAsObject = XML.parse(newPomAsXML)

      // Fetch the dependencies from the new POM XML and convert into JS object
      var dependencies = pomAsObject.dependencies.dependency

      // return a Dependencies object that maps a server Id with its dependencies
      return new model.Dependencies(convertAsDependencyObjects(dependencies))
    }
    return descriptor
  } 
}

/*
* 
*
*/
var replaceVersionNumber = function (properties, pom) {

  var newPom = pom
  for (var property in properties) {
    if (properties.hasOwnProperty(property)) {
      var searchStr = '${' + property + '}'
      newPom = newPom.replace(new RegExp(escapeRegExp(searchStr), 'g'), properties[property])
    }
  } 
  return newPom
}

var convertAsDependencyObjects = function (dependencies) {

  var newDependenciesArray = [];
  for (var i = 0; i < dependencies.length; i++) {
    var dependency = new model.Dependency(dependencies[i].groupId, dependencies[i].artifactId, dependencies[i].version)
    newDependenciesArray.push(dependency)
  }

  return newDependenciesArray
}

var escapeRegExp = function (str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

