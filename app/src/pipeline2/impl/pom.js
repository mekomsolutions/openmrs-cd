var model = require("../../models/model");
var utils = require("../../utils/utils");
var fs = require("fs");
var XML = require("pixl-xml");

module.exports = {
  // Constructor function
  getInstance: function(serverId, pomAsXML) {
    var descriptor = new model.Descriptor(serverId, pomAsXML);

    descriptor.getDependencies = function() {
      var pomAsObject = XML.parse(this.rawData);

      // Fetch the version numbers from the XML
      var properties = pomAsObject.properties;

      // Replace the version numbers in the rawPom directly
      var newPomAsXML = replaceVersionNumber(properties, this.rawData);
      pomAsObject = XML.parse(newPomAsXML);

      // return a list of dependencies that maps a server Id with its dependencies
      return convertAsProjectObjects(pomAsObject.dependencies.dependency);
    };
    return descriptor;
  }
};

var replaceVersionNumber = function(properties, pom) {
  var newPom = pom;
  for (var property in properties) {
    if (properties.hasOwnProperty(property)) {
      var searchStr = "${" + property + "}";
      newPom = newPom.replace(
        new RegExp(escapeRegExp(searchStr), "g"),
        properties[property]
      );
    }
  }
  return newPom;
};

var convertAsProjectObjects = function(dependencies) {
  var newDependenciesArray = [];
  for (var i = 0; i < dependencies.length; i++) {
    var dependency = new model.Project();
    dependency.groupId = dependencies[i].groupId;
    dependency.artifactId = dependencies[i].artifactId;
    dependency.version = dependencies[i].version;
    newDependenciesArray.push(dependency);
  }

  return newDependenciesArray;
};

var escapeRegExp = function(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};
