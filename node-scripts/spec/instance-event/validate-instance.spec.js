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
  var __rootPath__, tests, stubs, config, db;

  beforeEach(function() {
    // setup
    __rootPath__ = require("app-root-path").path;
    tests = require(path.resolve("spec/utils/testUtils"));
    stubs = tests.stubs();
    config = tests.config();
    db = proxyquire(cst.DBPATH, stubs);
  });

  it("should verify job parameters.", function() {
    // deps
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
      "<command>node /opt/node-scripts/src/" +
        config.getJobNameForInstanceEvent() +
        "/" +
        config.getInstanceEventJsScriptName()
    );
    expect(jobConfigFile).toContain(
      "<propertiesFile>" +
        "$JENKINS_HOME/jobs/$JOB_NAME/builds/$BUILD_NUMBER/" +
        config.getProjectBuildEnvvarsName() +
        "</propertiesFile>"
    );
    expect(jobConfigFile).toContain(
      "<projects>$" + config.varDownstreamJob() + "</projects>"
    );
    expect(jobConfigFile).toContain(
      '<macroTemplate>${ENV,var="' +
        config.varBuildName() +
        '"}</macroTemplate>'
    );
  });

  it("should skip downstream jobs when 'downstream_job' is empty", function() {
    // deps
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

    var skipCondition =
      'if [ "$downstream_job" = "" ]; then\n' +
      "\techo \"'downstream_job' list is empty. Aborting.\"\n" +
      "\texit 1\n" +
      "fi\n" +
      "exit 0";
    expect(jobConfigFile).toContain("<command>" + skipCondition + "</command>");
  });

  it("should process an existing instance definition with artifacts changes.", function() {
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
    var environment = {};
    environment[config.varDownstreamJob()] = config.getJobNameForPipeline3();

    expect(
      fs.readFileSync(
        path.resolve(
          config.getBuildDirPath(),
          config.getProjectBuildEnvvarsName()
        ),
        "utf8"
      )
    ).toContain(utils.convertToEnvVar(environment));

    // after
    tests.cleanup();
  });

  it("should process a new instance definition.", function() {
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
    var environment = {};
    environment[config.varDownstreamJob()] = config.getJobNameForPipeline3();
    environment[config.varInstanceUuid()] = uuid;
    environment[config.varInstanceName()] = "walhalla-staging";
    environment[config.varArtifactsChanges()] = JSON.stringify(true);
    environment[config.varDeploymentChanges()] = JSON.stringify(true);
    environment[config.varDataChanges()] = JSON.stringify(true);
    environment[config.varCreation()] = JSON.stringify(true);

    expect(
      fs.readFileSync(
        path.resolve(
          config.getBuildDirPath(),
          config.getProjectBuildEnvvarsName()
        ),
        "utf8"
      )
    ).toContain(utils.convertToEnvVar(environment));

    // after
    tests.cleanup();
  });
  it("should abort when processing a 'prod' type existing instance.", function() {
    process.env[config.varInstanceEvent()] = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_3.json"
      ),
      "utf8"
    );

    // pre-verif
    var instanceEvent = JSON.parse(process.env[config.varInstanceEvent()]);
    var beforeInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(beforeInstance).not.toEqual({});

    // replay
    proxyquire(fileInTest, stubs);

    // verif that the instances list is **not** updated
    var updatedInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(updatedInstance.artifacts).not.toEqual(instanceEvent.artifacts);

    // verif that the 'trigger' properties file is correctly generated
    var environment = {};
    // Downstream job should be empty
    environment[config.varDownstreamJob()] = "";

    expect(
      fs.readFileSync(
        path.resolve(
          config.getBuildDirPath(),
          config.getProjectBuildEnvvarsName()
        ),
        "utf8"
      )
    ).toContain(utils.convertToEnvVar(environment));

    // after
    tests.cleanup();
  });
  it("should abort when instance is inactive.", function() {
    process.env[config.varInstanceEvent()] = fs.readFileSync(
      path.resolve(
        "spec/instance-event/resources/test_instance_definition_1.json"
      ),
      "utf8"
    );

    var instanceEvent = JSON.parse(process.env[config.varInstanceEvent()]);

    process.env[config.varInstanceEvent()] = JSON.stringify(
      Object.assign(
        { deployment: "a_new_deployment_section" },
        { active: "false" },
        instanceEvent
      )
    );
    // replay
    proxyquire(fileInTest, stubs);

    var updatedInstance = db.getInstanceDefinition(instanceEvent.uuid);
    // verif that the instance is set to inactive
    expect(updatedInstance.active).toEqual("false");

    // and that the instance def is not updated
    expect(updatedInstance.active).not.toEqual("a_new_deployment_section");

    // do it again now that the instance def is saved as inactive
    // and the instance event does not contain 'active: false' anymore
    process.env[config.varInstanceEvent()] = JSON.stringify(
      Object.assign({ deployment: "a_new_deployment_section" }, instanceEvent)
    );
    // replay
    proxyquire(fileInTest, stubs);
    updatedInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(updatedInstance.active).toEqual("false");
    expect(updatedInstance.deployment).not.toEqual("a_new_deployment_section");

    // verif that the 'trigger' properties file is correctly generated
    var environment = {};
    // Downstream job should be empty
    environment[config.varDownstreamJob()] = "";
    expect(
      fs.readFileSync(
        path.resolve(
          config.getBuildDirPath(),
          config.getProjectBuildEnvvarsName()
        ),
        "utf8"
      )
    ).toContain(utils.convertToEnvVar(environment));

    // set back to 'active:true' and ensure that the instance is updated this time
    process.env[config.varInstanceEvent()] = JSON.stringify(
      Object.assign(
        { deployment: "a_new_deployment_section" },
        { active: "true" },
        instanceEvent
      )
    );
    // replay
    proxyquire(fileInTest, stubs);
    updatedInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(updatedInstance.deployment).toEqual("a_new_deployment_section");

    // if no 'active' field is given, should consider the instance active:true and then update accordingly
    process.env[config.varInstanceEvent()] = JSON.stringify(
      Object.assign({ deployment: "a_new_deployment_section" }, instanceEvent)
    );
    // replay
    proxyquire(fileInTest, stubs);
    updatedInstance = db.getInstanceDefinition(instanceEvent.uuid);
    expect(updatedInstance.deployment).toEqual("a_new_deployment_section");

    // after
    tests.cleanup();
  });
});
