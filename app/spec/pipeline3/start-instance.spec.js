"use strict";

describe("Start instance scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const proxyquire = require("proxyquire");

  var tests, stubs, config, scripts, db;
  var instanceUuid;
  var expectedRsyncCommandAndArgs, expectedRsyncRemoteHostConnectionStr;

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
    expectedRsyncCommandAndArgs = "rsync -avz -e 'ssh -p 22' ";
    expectedRsyncRemoteHostConnectionStr = "ec2-user@54.154.133.95:";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should generate bash script upon artifact changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );
    var ssh = instanceDef.deployment.host.value;

    expect(script).toContain(
      scripts.remote(ssh, scripts.container.restart(instanceUuid))
    );
  });

  it("should generate bash script upon deployment changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDeploymentChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;
    var docker = scripts.container;

    expect(script).toContain(
      scripts.remote(ssh, docker.remove(instanceUuid)) +
        scripts.remote(ssh, docker.run(instanceUuid, instanceDef))
    );
  });
});
