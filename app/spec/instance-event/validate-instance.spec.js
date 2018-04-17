"use strict";

describe("validate-instance", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const utils = require(path.resolve("src/utils/utils"));
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  // setup
  const fileInTest = path.resolve("src/instance-event/validate-instance.js");

  it("should process an existing instance definition with artifacts changes.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env.instanceDefinitionEvent = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_1.json"
      ),
      "utf8"
    );

    // pre-verif
    var instanceEvent = JSON.parse(process.env.instanceDefinitionEvent);
    var beforeInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(beforeInstance).not.toEqual({});

    // replay
    proxyquire(fileInTest, stubs);

    // verif that the instances list is updated accordingly
    var updatedInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(updatedInstance.artifacts).toEqual(instanceEvent.artifacts);
    expect(beforeInstance.artifacts).not.toEqual(instanceEvent.artifacts);

    // verif that the 'trigger' properties file is correctly generated
    var triggerParams = {};
    triggerParams[config.varDownstreamJob()] = config.getJobNameForPipeline3();
    triggerParams[config.varInstanceUuid()] = instanceEvent.uuid;
    triggerParams[config.varArtifactsChanges()] = JSON.stringify(true);
    triggerParams[config.varDeploymentChanges()] = JSON.stringify(false);
    triggerParams[config.varDataChanges()] = JSON.stringify(false);

    expect(
      fs.readFileSync(
        path.resolve(
          config.getBuildDirPath(),
          config.getProjectBuildTriggerEnvvarsName()
        ),
        "utf8"
      )
    ).toEqual(utils.convertToEnvVar(triggerParams));

    // after
    tests.cleanup();
  });

  it("should process a new instance definition.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env.instanceDefinitionEvent = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_2.json"
      ),
      "utf8"
    );

    // pre-verif
    var instanceEvent = JSON.parse(process.env.instanceDefinitionEvent);
    expect(db.getInstanceDefinition(null, instanceEvent.name)).toEqual({});

    // replay
    proxyquire(fileInTest, stubs);

    // verif that the instances list is updated accordingly
    var savedInstance = db.getInstanceDefinition(null, instanceEvent.name);
    expect(savedInstance.artifacts).toEqual(instanceEvent.artifacts);

    var uuid = savedInstance.uuid;
    delete savedInstance.uuid;
    delete savedInstance.created;
    delete savedInstance.updated;
    delete savedInstance.status;
    expect(savedInstance).toEqual(instanceEvent);

    // verif that the 'trigger' properties file is correctly generated
    var triggerParams = {};
    triggerParams[config.varDownstreamJob()] = config.getJobNameForPipeline3();
    triggerParams[config.varInstanceUuid()] = uuid;
    triggerParams[config.varArtifactsChanges()] = JSON.stringify(true);
    triggerParams[config.varDeploymentChanges()] = JSON.stringify(true);
    triggerParams[config.varDataChanges()] = JSON.stringify(false);

    expect(
      fs.readFileSync(
        path.resolve(
          config.getBuildDirPath(),
          config.getProjectBuildTriggerEnvvarsName()
        ),
        "utf8"
      )
    ).toEqual(utils.convertToEnvVar(triggerParams));

    // after
    tests.cleanup();
  });
});
