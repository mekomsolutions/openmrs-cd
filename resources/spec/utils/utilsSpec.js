describe('Tests suite for Utils ', function () {

  const folderInTest = __dirname + '/../../src/utils/'
  const fs = require('fs')
  const utils = require(folderInTest + 'utils')
  const model = require(folderInTest + '../models/model')

  it ('should convert a list of dependencies sorted by serverId into a by artifact list', function () {

    var dependenciesByServer =  JSON.parse(fs.readFileSync(__dirname + '/resources/dependenciesByServer.json', 'utf8'))
    var expectedResult =  JSON.parse(fs.readFileSync(__dirname + '/resources/dependenciesByArtifact.json', 'utf8'))
    
    var dependenciesByArtifact =  utils.sortByArtifact(dependenciesByServer)

    expect(dependenciesByArtifact).toEqual(expectedResult)
  })

  it ('should get the matching server and update the history log file', function () {

    var history = JSON.parse(fs.readFileSync(__dirname + '/resources/history.json', 'utf8'))

    var dependencies =  JSON.parse(fs.readFileSync(__dirname + '/resources/dependenciesByArtifact.json', 'utf8'))

    var artifact = JSON.parse(fs.readFileSync(__dirname + '/resources/artifact.json', 'utf8'))
    utils.setMatchingServersAndUpdateHistory(dependencies, history, new model.ServerEvent(Date.now(), artifact))
    expect(history.id1.serverEvents.length).toEqual(2)
    expect(history.id253.serverEvents.length).toEqual(3)

    var artifact2 = JSON.parse(fs.readFileSync(__dirname + '/resources/artifact2.json', 'utf8'))
    utils.setMatchingServersAndUpdateHistory(dependencies, history, new model.ServerEvent(Date.now(), artifact2))
    expect(history.id1.serverEvents.length).toEqual(3)
    expect(history.id253.serverEvents.length).toEqual(3)
  })

})