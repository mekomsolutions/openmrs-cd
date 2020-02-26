"use strict";

describe("Host preparation scripts", function() {
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

  it("should generate bash script upon artifacts changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/host-preparation.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), config.getHostPrepareScriptName()),
      "utf8"
    );
    var hostArtifactsDir = instanceDef.deployment.hostDir + "/artifacts";
    var ssh = instanceDef.deployment.host.value;
    expect(script).toContain(
      scripts.initFolder(hostArtifactsDir, ssh.user, ssh.group)
    );
    var srcDir = process.env.WORKSPACE + "/" + instanceUuid + "/artifacts/";

    ssh.remoteDst = true;

    expect(script).toContain(scripts.rsync(ssh, srcDir, hostArtifactsDir));
  });

  fit("should generate bash script upon deployment changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDeploymentChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/host-preparation.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), config.getHostPrepareScriptName()),
      "utf8"
    );
    var deploymentScripts = scripts[instanceDef.deployment.type];
    expect(script).toContain(
      deploymentScripts.prepareDeployment(
        instanceDef.deployment,
        instanceDef.name
      )
    );
    // ensure proxies have been setup
    var proxy = instanceDef.deployment.proxies[0];
    expect(script).toContain(
      scripts["dockerApacheMacro"].createProxy(
        proxy.value,
        instanceDef.deployment.maintenanceUrl,
        instanceDef.deployment.selinux
      )
    );
  });

  it("should generate bash script upon data changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/host-preparation.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), config.getHostPrepareScriptName()),
      "utf8"
    );
    var hostDataDir = instanceDef.deployment.hostDir + "/data";
    var ssh = instanceDef.deployment.host.value;
    var srcDir =
      "/var/docker-volumes/50b6cf72-0e80-457d-8141-a0c8c85d4dae/data/";

    expect(script).toContain(
      scripts.remote(
        ssh,
        scripts.rsync(ssh, srcDir, hostDataDir, true, false, "", true)
      )
    );
  });
  it("should fail when instance to copy is non-existing.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/host-preparation.js"
      ),
      tests.stubs()
    );

    instanceDef.data[0].value.uuid = "non-exsiting-instance-uuid";
    db.saveInstanceDefinition(instanceDef, instanceUuid);

    // Expect an error to be thrown...
    expect(function() {
      proxyquire(
        path.resolve(
          "src/" + config.getJobNameForPipeline3() + "/host-preparation.js"
        ),
        tests.stubs()
      );
    }).toThrow(
      new Error("Illegal argument: empty or unexisting instance definition.")
    );
  });
});
