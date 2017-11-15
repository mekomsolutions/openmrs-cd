describe('Tests suite for Pipeline2 ', function () {

  var folderInTest = __dirname + '/../../src/pipeline2/'
  var fs = require('fs')

  it ('should fetch each server descriptor (ex, pom.xml) based on the URLs provided in the servers.json file', function (done) {

    var fs = require('fs');
    var descriptorService = require(folderInTest + 'descriptorService')
    var servers = JSON.parse(fs.readFileSync(__dirname + '/resources/servers.json', 'utf8'))
    descriptorService.fetchRemoteDistroDescriptors(servers, function (errors, result) {
      expect(result[0].descriptor).not.toEqual("")
      expect(result[0].type).toEqual("pom")

      expect(result[1].descriptor).not.toEqual("")
      expect(result[1].type).toEqual("pom")

      expect(errors[0].error).toEqual(404)
      done()
    })

  })

  it ('should parse a pom file', function () {

    var descriptors = JSON.parse(fs.readFileSync(__dirname + '/resources/descriptors.json', 'utf8'))

    var allDeps = []
    descriptors.forEach(function(item) {
      var descriptor = require(folderInTest + '/impl/' + item.type).getInstance(item.serverId, item.descriptor)
      var serverDeps = descriptor.getDependencies()
      
      allDeps[item.serverId] = serverDeps 
    })

    var id1Server = allDeps.id1.dependencies
    expect(id1Server[0].version).toEqual("1.0-SNAPSHOT")
    expect(id1Server[0].groupId).toEqual("net.mekomsolutions")
    expect(id1Server[0].artifactId).toEqual("openmrs-config-cambodia")
    expect(id1Server[4].version).toEqual("0.89-SNAPSHOT")
    expect(id1Server[5].version).toEqual("0.89-SNAPSHOT")
    
    var id2Server = allDeps.id2.dependencies
    expect(id2Server[0].version).toEqual("1.0-SNAPSHOT")
    expect(id2Server[0].groupId).toEqual("org.globalhealthcoalition")
    expect(id2Server[0].artifactId).toEqual("openmrs-config-haiti")
    expect(id2Server[4].version).toEqual("0.89-SNAPSHOT")
    expect(id2Server[5].version).toEqual("0.89-SNAPSHOT")
    
  })

  // it ('should return a matching server', function () {

  // })

});