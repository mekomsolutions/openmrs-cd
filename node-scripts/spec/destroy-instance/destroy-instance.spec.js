"use strict";

describe("Destroy instance scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));
  var tests, stubs, utils, config, scripts, db;
  var instanceUuid, testRandomString;

  beforeEach(function() {
    utils = require(path.resolve("src/utils/utils"));
    tests = require(path.resolve("spec/utils/testUtils"));
    stubs = tests.stubs();

    config = tests.config();
    scripts = require(path.resolve(
      "src/" + config.getJobNameForPipeline3() + "/scripts"
    ));
    db = proxyquire(path.resolve("src/utils/db"), stubs);

    process.env[config.varArtifactsChanges()] = "false";
    process.env[config.varDeploymentChanges()] = "false";
    process.env[config.varDataChanges()] = "false";
    process.env[config.varPropertiesChanges()] = "false";
    process.env[config.varCreation()] = "false";

    instanceUuid = "557d0edb-2029-4da5-b1a1-5c9dae983327";
    testRandomString = "0.7p3z2u8fbvi76n32bg";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should generate bash script to destroy instance.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);
    const dockerContainer = require(path.resolve(
      "src/pipeline3/impl/" + instanceDef.deployment.type
    ));

    // replay
    proxyquire(
      path.resolve("src/destroy-instance/destroy-instance.js"),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), "destroy-instance.sh"),
      "utf8"
    );
    expect(script).toContain(dockerContainer.stop(instanceDef, true));
    expect(script).toContain(dockerContainer.remove(instanceDef, true));
  });
});
