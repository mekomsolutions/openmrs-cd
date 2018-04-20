"use strict";

describe("Project build script", function() {
  const fs = require("fs");
  const path = require("path");

  it("should generate build and deploy scripts", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));
    const proxyquire = require("proxyquire");
    const model = require(path.resolve("src/models/model"));
    const config = require(path.resolve("src/utils/config"));

    // setup
    process.env[config.varProjectType()] = "artifact_type"; // eg. 'openmrsmodule'

    var mockBuild = new model.ProjectBuild();
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

    var stubs = {};
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

    // verif
    expect(fs.readFileSync(config.getBuildShellScriptPath(), "utf8")).toEqual(
      "__build_script__"
    );
    expect(fs.readFileSync(config.getDeployShellScriptPath(), "utf8")).toEqual(
      "__deploy_script__"
    );

    // after
    tests.cleanup();
  });
});
