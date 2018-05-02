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
    const model = require(path.resolve("src/utils/model"));

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
          hostDir: "",
          value: new model.DockerDeployment()
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: { not_a: "dir path" },
          value: new model.DockerDeployment()
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "/tmp/{{uuid}}",
          value: new model.DockerDeployment()
        },
        true
      );
    }).not.toThrow();
  });

  it("should validate an instances artifacts section.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(_script_.validateArtifactSection(null)).toBeTruthy();
    expect(_script_.validateArtifactSection(undefined)).toBeTruthy();
    expect(_script_.validateArtifactSection({})).toBeTruthy();

    expect(function() {
      _script_.validateArtifactSection({
        type: ""
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactSection({
        type: "foobar"
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactSection({
        type: "maven"
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactSection({
        type: "maven",
        value: new model.MavenProject()
      });
    }).not.toThrow();
  });
});
