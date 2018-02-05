"use strict";
describe("Tests suite for Pipeline1 ", function() {
  it("should implement all required functions from model", function() {
    var folderInTest = __dirname + "/../../src/pipeline1/";

    const fs = require("fs");
    const model = require(__dirname + "/../../src/models/model");
    const modelTestUtils = require(__dirname + "/../models/modelTestUtils");

    // Running tests on each file present in the  folderInTest folder and ensure they correctly implement every needed function
    fs.readdirSync(folderInTest + "impl/").forEach(file => {
      var type = file.split(".")[0];
      var project = new require(folderInTest + "impl/" + type).getInstance();

      modelTestUtils.ensureImplmentedFunctions(project, model.Project);

      var metadata = {
        commit: 123456
      };

      var artifactFile = project.getArtifactFile(
        __dirname + "/resources/" + type + "/",
        metadata
      );

      modelTestUtils.ensureImplmentedFunctions(
        artifactFile,
        model.ArtifactFile
      );
    });
  });
});
