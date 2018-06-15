"use strict";

describe("Update-status", function() {
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

    instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should save instance with the new status", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // Saving the status
    fs.writeFileSync(
      path.resolve(config.getBuildDirPath(), config.getStatusFileName()),
      JSON.stringify({ status: "5" })
    );

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/update-status.js"
      ),
      tests.stubs()
    );

    var instanceDefStatus = db.getInstanceDefinition(instanceUuid).status;
    expect(instanceDefStatus).toBe("5");
  });

  it("should not save instance with the new status", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // Saving the status
    fs.writeFileSync(
      path.resolve(config.getBuildDirPath(), config.getStatusFileName()),
      JSON.stringify({ status: "" })
    );

    expect(function() {
      // replay
      proxyquire(
        path.resolve(
          "src/" + config.getJobNameForPipeline3() + "/update-status.js"
        ),
        tests.stubs()
      );
    }).toThrow(
      new Error(
        "Illegal argument: unable to set an empty status for the instance."
      )
    );
  });
});
