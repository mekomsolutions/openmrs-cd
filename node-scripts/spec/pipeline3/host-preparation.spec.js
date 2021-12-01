"use strict";

describe("Host preparation scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));
  const dockerContainer = require(path.resolve("src/pipeline3/impl/docker"));
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
    process.env[config.varPropertiesChanges()] = "false";
    process.env[config.varCreation()] = "false";

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
    var hostArtifactsDir =
      instanceDef.deployment.hostDir + "/" + instanceDef.name + "/artifacts";
    var ssh = instanceDef.deployment.host.value;
    expect(script).toContain(
      scripts.initFolder(hostArtifactsDir, ssh.user, ssh.group)
    );
    var srcDir = process.env.WORKSPACE + "/" + instanceUuid + "/artifacts/";

    ssh.remoteDst = true;

    expect(script).toContain(
      scripts.rsync(
        ssh,
        srcDir,
        hostArtifactsDir,
        true,
        false,
        "-avzz --delete"
      )
    );
  });

  it("should generate bash script upon deployment changes.", function() {
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
    expect(script).toContain(
      "docker pull mekomsolutions/bahmni:cambodia-release-0.90"
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

    var hostPrepareDataScriptMock =
      "Data Script mock for the Host Preparation stage";

    // Mock the implementation of Docker Monolith: hostPreparation: Data Scripts
    var mockDocker = Object.assign({}, dockerContainer);
    mockDocker.hostPreparation = {
      getDataScript: function() {
        return hostPrepareDataScriptMock;
      }
    };

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/host-preparation.js"
      ),
      tests.stubs({ "./impl/dockerMonolith": mockDocker })
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(config.getBuildDirPath(), config.getHostPrepareScriptName()),
      "utf8"
    );

    // ensure DataScript is called
    expect(script).toContain(hostPrepareDataScriptMock);
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
      new Error("Illegal argument: empty or non-existing instance definition.")
    );
  });
});
