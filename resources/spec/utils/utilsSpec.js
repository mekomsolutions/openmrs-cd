describe('Tests suite for Utils ', function () {

  var folderInTest = __dirname + '/../../src/utils/'
  var fs = require('fs')
  var utils = require(folderInTest + "utils")

  it ('should convert a list of dependencies sorted by serverId into a by artifact list', function () {

    var dependenciesByServer =  JSON.parse(fs.readFileSync(__dirname + '/resources/dependenciesByServer.json', 'utf8'))
    var expectedResult =  JSON.parse(fs.readFileSync(__dirname + '/resources/dependenciesByArtifact.json', 'utf8'))
    
    var dependenciesByArtifact =  utils.sortByArtifact(dependenciesByServer)

    expect(dependenciesByArtifact).toEqual(expectedResult)
  })

})