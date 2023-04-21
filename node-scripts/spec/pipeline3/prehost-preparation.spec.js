"use strict";

describe("Pre-host preparation scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const proxyquire = require("proxyquire");

  it("should generate script for a Maven artifacts change.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));
    const stubs = tests.stubs();
    const config = tests.config();

    const scripts = require(path.resolve(
      "src/" + config.getJobNameForPipeline3() + "/scripts"
    ));

    // setup
    const instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/prehost-preparation.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getPrehostPrepareScriptName()
      ),
      "utf8"
    );
    var artifactsPath = config.getCDArtifactsDirPath(instanceUuid);

    var expectedScript =
      "set -xe\n" +
      "\n" +
      "sudo rm -rf " +
      artifactsPath +
      "\n" +
      "sudo mkdir -p " +
      artifactsPath +
      "\n" +
      "sudo chown -R jenkins:jenkins " +
      artifactsPath +
      "\n" +
      "\n" +
      scripts.fetchArtifact(
        {
          groupId: "net.mekomsolutions",
          artifactId: "openmrs-distro-cambodia",
          version: "1.1.0-SNAPSHOT",
          packaging: "zip"
        },
        "maven",
        artifactsPath,
        "https://maven.repo.com"
      );

    expect(script).toContain(expectedScript);

    // after
    tests.cleanup();
  });
});
