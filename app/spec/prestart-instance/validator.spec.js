"use strict";

describe("The instances config validator", function() {
  // deps
  const path = require("path");

  // setup
  const srcFolder = path.resolve(__dirname, "..", "..", "src");
  const fileInTest = path.resolve(
    __dirname,
    "..",
    "..",
    "src/prestart-instance/validator.js"
  );

  it("should assess instances definition status.", function() {
    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(_script_.isNewInstance({})).toBe(true);
    expect(_script_.isNewInstance(null)).toBe(true);
    expect(_script_.isNewInstance(undefined)).toBe(true);
    expect(_script_.isNewInstance({ foo: "bar" })).toBe(false);
  });

  it("should validate instances deployment section.", function() {
    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateDeploymentConfig(null);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(undefined);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({});
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({
        type: ""
      });
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({
        type: "foobar"
      });
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({
        type: "docker"
      });
    }).not.toThrow();
  });

  it("should validate instances artifacts section.", function() {
    // deps
    const model = require(path.resolve(srcFolder, "models/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateArtifactsConfig(null);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig(undefined);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({});
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({
        type: ""
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({
        type: "foobar"
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({
        type: "maven"
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig({
        type: "maven",
        value: new model.MavenProject()
      });
    }).not.toThrow();
  });
});
