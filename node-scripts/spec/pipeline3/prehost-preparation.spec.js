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
      "sudo mkdir -p " +
      artifactsPath +
      "\n" +
      "sudo chown -R jenkins:jenkins " +
      artifactsPath +
      "\n" +
      "rm -rf " +
      artifactsPath +
      "/* " +
      artifactsPath +
      "/.[a-zA-Z0-9_-]*\n" +
      "mvn dependency:copy -Dartifact=net.mekomsolutions:openmrs-distro-cambodia:1.1.0-SNAPSHOT:zip " +
      "-DoutputDirectory=" +
      artifactsPath +
      "\n" +
      "unzip " +
      artifactsPath +
      "/" +
      "openmrs-distro-cambodia-1.1.0-SNAPSHOT.zip" +
      " -d " +
      artifactsPath +
      "/";

    expect(script).toContain(expectedScript);

    // after
    tests.cleanup();
  });
});
