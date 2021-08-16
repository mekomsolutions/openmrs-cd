"use strict";

describe("Project build script", function() {
  const fs = require("fs");
  const path = require("path");

  const proxyquire = require("proxyquire");

  var tests, utils, model, config;

  beforeEach(function() {
    tests = require(path.resolve("spec/utils/testUtils"));
    utils = require(path.resolve("src/utils/utils"));
    model = require(path.resolve("src/utils/model"));
    config = require(path.resolve("src/utils/config"));

    process.env[config.varProjectType()] = "default";
    process.env[config.varRepoUrl()] =
      "https://github.com/mekomsolutions/bahmni-config-cambodia";
    process.env[config.varBranchName()] = "master";
    process.env[config.varCommitId()] = "4f29e69";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should generate build and deploy scripts, and the artifact as envvars and JSON files.", function() {
    // setup
    config = tests.config();

    const testArtifact1 = JSON.parse(
      fs.readFileSync(
        path.resolve("spec/utils/resources/test_artifact_1.json"),
        "utf8"
      )
    );
    var mockBuild = new model.ProjectBuild();
    mockBuild.getArtifact = function(args) {
      return testArtifact1;
    };
    mockBuild.getBuildScript = function() {
      const script = new model.Script();
      script.body = "__build_script__";
      return script;
    };
    mockBuild.getDeployScript = function(artifact) {
      const script = new model.Script();
      script.body = "__deploy_script__";
      return script;
    };

    const stubs = {};
    stubs["./impl/" + process.env[config.varProjectType()]] = {
      getInstance: function() {
        return mockBuild;
      },
      "@noCallThru": true
    };

    // replay
    proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline1() + "/build.js"),
      tests.stubs(stubs)
    );

    // verif scripts
    expect(fs.readFileSync(config.getBuildShellScriptPath(), "utf8")).toEqual(
      "__build_script__"
    );
    expect(fs.readFileSync(config.getDeployShellScriptPath(), "utf8")).toEqual(
      "__deploy_script__"
    );

    // verif artifact
    const actualArtifact = JSON.parse(
      fs.readFileSync(config.getBuildArtifactJsonPath(), "utf8")
    );
    expect(actualArtifact).toEqual(testArtifact1);

    expect(
      fs.readFileSync(config.getBuildArtifactEnvvarsPath(), "utf8")
    ).toEqual(utils.convertToProperties(actualArtifact));
  });
});
