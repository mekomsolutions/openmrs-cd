"use strict";

describe("validate-instance", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const config = require(path.resolve("src/utils/config"));
  const utils = require(path.resolve("src/utils/utils"));
  const tests = require(path.resolve("spec/utils/testUtils"));
  const proxyquire = require("proxyquire");

  // setup
  const fileInTest = path.resolve("src/instance-event/validate-instance.js");

  it("should process an existing instance definition with artifacts changes.", function() {
    // setup
    process.env.instanceDefinitionEvent = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_1.json"
      ),
      "utf8"
    );
    var stubs = tests.stubs();

    var beforeInstances = JSON.parse(
      fs.readFileSync(tests.config().getInstancesConfigPath(), "utf8")
    );

    // replay
    proxyquire(fileInTest, stubs);

    // verif that the instances list is updated accordingly
    var instances = JSON.parse(
      fs.readFileSync(tests.config().getInstancesConfigPath(), "utf8")
    );
    expect(instances.length).toEqual(beforeInstances.length);

    var expected = JSON.parse(process.env.instanceDefinitionEvent);
    var filtered = _.filter(instances, function(o) {
      return o.uuid === expected.uuid;
    });
    expect(filtered.length).toEqual(1);
    var instance = filtered[0];

    var filtered = _.filter(beforeInstances, function(o) {
      return o.uuid === expected.uuid;
    });
    expect(filtered.length).toEqual(1);
    var beforeInstance = filtered[0];

    expect(instance.artifacts).toEqual(expected.artifacts);
    expect(beforeInstance.artifacts).not.toEqual(expected.artifacts);

    // verif that the 'trigger' properties file is correctly generated
    var triggerParams = {};
    triggerParams[config.varDownstreamJob()] = config.getJobNameForPipeline3();
    triggerParams[config.varInstanceUuid()] = expected.uuid;
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
    process.env.instanceDefinitionEvent = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_2.json"
      ),
      "utf8"
    );
    var stubs = tests.stubs();

    var beforeInstances = JSON.parse(
      fs.readFileSync(tests.config().getInstancesConfigPath(), "utf8")
    );

    // replay
    proxyquire(fileInTest, stubs);

    // verif that the instances list is updated accordingly
    var instances = JSON.parse(
      fs.readFileSync(tests.config().getInstancesConfigPath(), "utf8")
    );
    expect(instances.length).toEqual(beforeInstances.length + 1);

    var filtered = _.differenceWith(instances, beforeInstances, _.isEqual);
    expect(filtered.length).toEqual(1);

    var instance = filtered[0];
    var expected = JSON.parse(process.env.instanceDefinitionEvent);
    var uuid = instance.uuid;
    delete instance.uuid;
    delete instance.created;
    delete instance.updated;
    delete instance.status;
    expect(instance).toEqual(expected);

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
