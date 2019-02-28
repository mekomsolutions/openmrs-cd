"use strict";

describe("'fetch-instanceDef' scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  const heredocDelimiter = cst.HEREDOC;
  var tests, stubs, config, scripts, db;
  var instanceUuid;
  var remoteHostConnectionStr, rsyncCommand, remoteRsyncCommand, sshCommand;

  beforeEach(function() {
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

    instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should fetch a given instance and return it as JSON", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;

    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" +
          config.getJobNameForPipeline3() +
          "/" +
          config.getFetchInstanceDefJsScriptName()
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getFetchInstanceDefScriptName()
      ),
      "utf8"
    );
    var proxies = instanceDef.deployment.proxies;
    expect(script).toContain(JSON.stringify(instanceDef));
  });
});
