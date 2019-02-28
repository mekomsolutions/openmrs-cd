"use strict";

describe("The config object", function() {
  // deps
  const path = require("path");
  const config = require(__dirname + "/../../src/utils/config");
  const fs = require("fs");

  // context setup
  require(path.resolve("spec/utils/testUtils")).stubs();

  it("should construct the path to the current build directory when $BUILD_PATH is not defined.", function() {
    // setup
    const __rootPath__ = require("app-root-path").path;
    var jenkinsSubProjectDir = path.resolve(__rootPath__, "..", "jenkins");

    // replay
    process.env.BUILD_PATH = "";

    // verif
    expect(config.getBuildDirPath()).toEqual(
      path.resolve(
        process.env.JENKINS_HOME,
        "jobs",
        process.env.JOB_NAME,
        "builds",
        process.env.BUILD_NUMBER
      )
    );
  });
  it("should get secrets from environment.", function() {
    const envJSON = [
      {
        password: "p@ssword",
        username: "root"
      },
      {
        password: "8HNVdvdgh765"
      }
    ];
    const envJSONAsString = JSON.stringify(envJSON);

    process.env[config.getSecretsEnvVar()] = envJSONAsString;

    var expectedSecrets = {
      username: "root",
      password: "8HNVdvdgh765"
    };

    expect(config.getSecrets().password).toEqual(expectedSecrets.password);
    expect(config.getSecrets().password).not.toEqual(envJSON.username);

    process.env[config.getSecretsEnvVar()] = "";

    expect(config.getSecrets()).toEqual({});
  });
});
