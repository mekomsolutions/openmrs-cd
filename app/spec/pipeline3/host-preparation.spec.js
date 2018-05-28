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
    remoteHostConnectionStr = "ec2-user@54.154.133.95";
    sshCommand = "ssh -T " + remoteHostConnectionStr + " -p 22 <<";
    rsyncCommand = "rsync -avz";
    remoteRsyncCommand = rsyncCommand + " -e 'ssh -p 22' ";
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

    expect(script).toContain("mkdir -p " + hostArtifactsDir);
    var srcDir = process.env.WORKSPACE + "/" + instanceUuid + "/artifacts/";

    expect(script).toContain(
      remoteRsyncCommand +
        srcDir +
        " " +
        remoteHostConnectionStr +
        ":" +
        hostArtifactsDir
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
    expect(script).toContain(
      sshCommand +
        heredocDelimiter +
        "\n" +
        rsyncCommand +
        " /var/docker-volumes/50b6cf72-0e80-457d-8141-a0c8c85d4dae/data/ " +
        hostDataDir
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
