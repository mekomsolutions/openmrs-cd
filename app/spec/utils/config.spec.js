"use strict";

describe("The config object", function() {
  // deps
  const path = require("path");
  const config = require(__dirname + "/../../src/utils/config");
  const fs = require("fs");

  // context setup
  require(path.resolve("spec/utils/testUtils")).stubs();

  it("should construct the path to the current build directory when $CURRENT_BUILD_PATH is not defined.", function() {
    // setup
    const __rootPath__ = require("app-root-path").path;
    var jenkinsSubProjectDir = path.resolve(__rootPath__, "..", "jenkins");

    // replay
    process.env.CURRENT_BUILD_PATH = "";

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
});
