var utils = require('../utils/utils')

module.exports = {

  /**
  * An object that represents a dependency.
  *
  */
  Dependency: function (groupId, artifactId, version) {
    this.groupId = groupId
    this.artifactId = artifactId
    this.version = version
  },

  /**
  * An object that represents all the dependencies of a given server.
  *
  */
  Dependencies: function (dependencies) {
    this.dependencies = dependencies
  },
  /**
  * An object that represents an given server (an OpenMRS distro + ref) (such as a pom.xml file).
  *
  */
  Descriptor: function (serverId, rawData) {
    this.serverId = serverId
    this.rawData = rawData
    this.getDependencies = function () {
      return new Dependencies()
    }
  }

}