"use strict";

describe("The instances config validator", function() {
  // deps
  const path = require("path");

  // setup
  const fileInTest = path.resolve("src/instance-event/validator.js");

  it("should validate base instances definition.", function() {
    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateBaseConfig({ uuid: "cAcb5448", type: "staging" }, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig({ name: "foo-instance", type: "dev" }, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig(
        { uuid: "cAcb5448", name: "foo-instance", type: "dev" },
        false
      );
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig({ uuid: "cAcb5448" }, true);
    }).toThrow();
    expect(function() {
      _script_.validateBaseConfig({ type: "dev" }, true);
    }).toThrow();
  });

  it("should validate instances deployment section.", function() {
    // deps
    const model = require(path.resolve("src/models/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateDeploymentConfig(null, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(null, true);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(undefined, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(undefined, true);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({}, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({}, true);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: ""
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "foobar"
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          value: new model.DockerDeployment()
        },
        true
      );
    }).not.toThrow();
  });

  it("should validate instances artifacts section.", function() {
    // deps
    const model = require(path.resolve("src/models/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateArtifactsConfig(null, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(null, true);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(undefined, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(undefined, true);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({}, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({}, true);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(
        {
          type: ""
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(
        {
          type: "foobar"
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(
        {
          type: "maven"
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(
        {
          type: "maven",
          value: new model.MavenProject()
        },
        true
      );
    }).not.toThrow();
  });
});
