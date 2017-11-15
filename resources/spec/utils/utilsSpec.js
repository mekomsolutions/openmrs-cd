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

  it ('should get the matching server and update the history log file', function () {

    var history = JSON.parse(fs.readFileSync(__dirname + '/resources/history.json', 'utf8'))
    var artifact = JSON.parse(fs.readFileSync(__dirname + '/resources/artifact.json', 'utf8'))

    var dependencies =  JSON.parse(fs.readFileSync(__dirname + '/resources/dependenciesByArtifact.json', 'utf8'))
    utils.setMatchingServersAndUpdateHistory(artifact, dependencies, history)
    expect(history.id1.artifacts.length).toEqual(2)
    expect(history.id253.artifacts.length).toEqual(2)
    
    var artifact2 = JSON.parse(fs.readFileSync(__dirname + '/resources/artifact2.json', 'utf8'))
    utils.setMatchingServersAndUpdateHistory(artifact2, dependencies, history)
    expect(history.id1.artifacts.length).toEqual(3)
    expect(history.id253.artifacts.length).toEqual(2)
    })

})