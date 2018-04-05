"use strict";

describe("Pre-host preparation scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const config = require(path.resolve("src/utils/config"));
  const tests = require(path.resolve("spec/utils/testUtils"));
  const proxyquire = require("proxyquire");

  it("should generate script for a Maven artifacts change.", function() {
    // setup
    const instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/prehost-prepare.js"
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

    expect(script).toContain("mkdir -p " + artifactsPath);
    expect(script).toContain("rm -rf " + artifactsPath + "/*");
    expect(script).toContain(
      "mvn dependency:unpack -Dartifact=net.mekomsolutions:openmrs-distro-cambodia:1.0.0-SNAPSHOT:zip -DoutputDirectory=" +
        artifactsPath
    );

    // after
    tests.cleanup();
  });
});
