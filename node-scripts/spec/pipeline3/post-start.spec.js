"use strict";

describe("Post start scripts", function() {
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
    process.env[config.varCreation()] = "false";

    instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
    testRandomString = "0.7p3z2u8fbvi76n32bg";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should call the computeAdditionalScripts method.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDeploymentChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" +
          config.getJobNameForPipeline3() +
          "/" +
          config.getPostStartJsScriptName()
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), config.getPostStartScriptName()),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    expect(script).toContain("/some/script.sh");
    expect(script).toContain(docker.restart(instanceUuid));
  });

  it("should clear the search index.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDeploymentChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);
    var container = scripts[instanceDef.deployment.type];

    // replay
    proxyquire(
      path.resolve(
        "src/" +
          config.getJobNameForPipeline3() +
          "/" +
          config.getPostStartJsScriptName()
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), config.getPostStartScriptName()),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;

    var clearIndexSql =
      "\"UPDATE global_property SET global_property.property_value = '' WHERE global_property.property = 'search.indexVersion';\"";

    var clearIndexCmd =
      "echo " + clearIndexSql + " | " + "mysql -uroot -ppassword openmrs";

    expect(script).toContain(
      scripts.remote(ssh, container.exec(instanceDef.uuid, clearIndexCmd))
    );
  });
});
