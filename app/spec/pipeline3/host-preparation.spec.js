"use strict";

describe("Host preparation scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const proxyquire = require("proxyquire");

  it("should generate bash script.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));
    const stubs = tests.stubs();

    // setup
    const config = tests.config();
    const scripts = require(path.resolve(
      "src/" + config.getJobNameForPipeline3() + "/scripts"
    ));
    const db = proxyquire(path.resolve("src/utils/db"), stubs);

    const instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";
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
    var hostArtifactsDir = instanceDef.deployment.hostDir + "/artifacts";

    expect(script).toContain("mkdir -p " + hostArtifactsDir);
    expect(script).toContain("rm -rf " + hostArtifactsDir + "/*");
    var srcDir = process.env.WORKSPACE + "/" + instanceUuid + "/artifacts/";
    expect(script).toContain(
      "rsync -avz -e 'ssh -p 22' " +
        srcDir +
        " ec2-user@54.154.133.95:" +
        hostArtifactsDir
    );
    expect(script).toContain(
      "docker pull mekomsolutions/bahmni:cambodia-release-0.90"
    );

    // after
    tests.cleanup();
  });
});
