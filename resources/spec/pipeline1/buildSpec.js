
describe('Tests suite for Pipeline1 ', function () {

  it('should implement the interface functions', function () {

    const fs = require('fs');
    
    var folderInTest = __dirname + '/../../src/pipeline1/'

    fs.readdirSync(folderInTest + 'impl/').forEach(file => {

      var type = file.split('.')[0]
      var project = new require(folderInTest + 'impl/' + type).getInstance()

      var artifact = project.getArtifact(__dirname + '/resources/' + type + "/")

      expect(artifact.extension).not.toEqual("");
      expect(project.getBuildScript.value).not.toEqual("")
      expect(project.getBuildScriptAsString).not.toEqual("")
    })    
  });
});