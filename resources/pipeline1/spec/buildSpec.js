
describe('Tests suite for Pipeline1 ', function () {

  beforeEach( function() {

  })

  it('should implement the interface functions', function () {

    const fs = require('fs');

    fs.readdirSync(__dirname + '/../impl/').forEach(file => {

      var type = file.split('.')[0]
      console.log(type)
      var project = new require('../impl/' + type).getInstance()

      var artifact = project.getArtifact(__dirname + '/resources/' + type + "/")

      expect(artifact.extension).not.toEqual("");
      expect(project.getBuildScript.value).not.toEqual("")
      expect(project.getBuildScriptAsString).not.toEqual("")
    })    
  });
});