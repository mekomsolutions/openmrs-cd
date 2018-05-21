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
    expect(script).toContain(
      "set -e\n" +
        "ssh -T ec2-user@54.154.133.95 -p 22 <<heredoc_delimiter_7e228d99\n" +
        "docker run -dit --restart unless-stopped --publish 8180:80 --publish 8733:443 --label type=dev --label group=tlc --name cacb5448-46b0-4808-980d-5521775671c0 --hostname bahmni --mount type=bind,source=/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0,target=/mnt mekomsolutions/bahmni:cambodia-release-0.90\n" +
        "heredoc_delimiter_7e228d99"
    );
  });
});
