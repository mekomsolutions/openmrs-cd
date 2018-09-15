"use strict";

describe("validate-instance", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");
  const S = require("string");

  const utils = require(path.resolve("src/utils/utils"));
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  // setup
  const fileInTest = path.resolve("src/instance-event/validate-instance.js");

  it("should verify job parameters.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const config = require(path.resolve("src/utils/config"));
    const ent = require("ent");

    // replay
    var jobConfigFile = fs.readFileSync(
      path.resolve(
        __rootPath__,
        "..",
        "jenkins/jenkins_home/jobs/" +
          config.getJobNameForInstanceEvent() +
          "/config.xml"
      ),
      "utf8"
    );
    jobConfigFile = ent.decode(jobConfigFile);

    // verif
    expect(jobConfigFile).toContain(
      "<name>" + config.varInstanceEvent() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<command>node /opt/app/src/" +
        config.getJobNameForInstanceEvent() +
        "/" +
        config.getInstanceEventJsScriptName()
    );
    expect(jobConfigFile).toContain(
      "<propertiesFile>" +
        "$JENKINS_HOME/jobs/$JOB_NAME/builds/$BUILD_NUMBER/" +
        config.getProjectBuildTriggerEnvvarsName() +
        "</propertiesFile>"
    );
    expect(jobConfigFile).toContain(
      "<projects>$" + config.varDownstreamJob() + "</projects>"
    );
    expect(jobConfigFile).toContain(
      '<macroTemplate>${ENV,var="' +
        config.varInstanceName() +
        '"} - ${ENV,var="' +
        config.varInstanceUuid() +
        '"}</macroTemplate>'
    );
  });

  it("should process an existing instance definition with artifacts changes.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env[config.varInstanceEvent()] = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_1.json"
      ),
      "utf8"
    );

    // pre-verif
    var instanceEvent = JSON.parse(process.env[config.varInstanceEvent()]);
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
    triggerParams[config.varInstanceName()] = "cambodia-dev-1";
    triggerParams[config.varArtifactsChanges()] = JSON.stringify(true);
    triggerParams[config.varDeploymentChanges()] = JSON.stringify(false);
    triggerParams[config.varDataChanges()] = JSON.stringify(false);
    triggerParams[config.varCreation()] = JSON.stringify(false);

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

    process.env[config.varInstanceEvent()] = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_2.json"
      ),
      "utf8"
    );

    // pre-verif
    var instanceEvent = JSON.parse(process.env[config.varInstanceEvent()]);
    expect(db.getInstanceDefinition(null, instanceEvent.name)).toEqual({});

    // replay
    proxyquire(fileInTest, stubs);

    // verif that the instances list is updated accordingly
    var savedInstance = db.getInstanceDefinition(null, instanceEvent.name);
    expect(savedInstance.artifacts).toEqual(instanceEvent.artifacts);

    // substitute instanceEvent aliases so it can be compared to the expected savedInstance
    instanceEvent.uuid = savedInstance.uuid;
    var aliasesMap = config.getInstanceDefinitionAliasesMap(instanceEvent);
    instanceEvent = JSON.parse(
      S(JSON.stringify(instanceEvent)).template(aliasesMap).s
    );

    var uuid = savedInstance.uuid;
    delete savedInstance.created;
    delete savedInstance.updated;
    delete savedInstance.status;

    expect(savedInstance).toEqual(instanceEvent);

    // verif that the 'trigger' properties file is correctly generated
    var triggerParams = {};
    triggerParams[config.varDownstreamJob()] = config.getJobNameForPipeline3();
    triggerParams[config.varInstanceUuid()] = uuid;
    triggerParams[config.varInstanceName()] = "walhalla-staging";
    triggerParams[config.varArtifactsChanges()] = JSON.stringify(true);
    triggerParams[config.varDeploymentChanges()] = JSON.stringify(true);
    triggerParams[config.varDataChanges()] = JSON.stringify(true);
    triggerParams[config.varCreation()] = JSON.stringify(true);

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
