
describe('Tests suite for Pipeline1 ', function () {

  it('should implement all interface functions', function () {

    const fs = require('fs');
    
    var folderInTest = __dirname + '/../../src/pipeline1/'

    console.log("Running tests on each file present in the '" + folderInTest + "' folder and ensure they correctly implement every needed function")
    fs.readdirSync(folderInTest + 'impl/').forEach(file => {

      var type = file.split('.')[0]
      console.log("#  " + type)
      var project = new require(folderInTest + 'impl/' + type).getInstance()

      var artifact = project.getArtifact(__dirname + '/resources/' + type + "/")

      expect(artifact.extension).not.toEqual(undefined);
      expect(artifact.path).not.toEqual(undefined);
      expect(artifact.name).not.toEqual(undefined);
      expect(artifact.version).not.toEqual(undefined);
      expect(artifact.filename).not.toEqual(undefined);
      expect(artifact.destFilename).not.toEqual(undefined);

      expect(project.getBuildScript().value).not.toEqual(undefined)
      expect(project.getBuildScript().type).not.toEqual(undefined)
      expect(project.getBuildScriptAsString()).not.toEqual("")
      expect(project.getDeployScript().value).not.toEqual(undefined)
      expect(project.getDeployScript().type).not.toEqual(undefined)
      expect(project.getDeployScriptAsString()).not.toEqual("")
   })    
  });

});