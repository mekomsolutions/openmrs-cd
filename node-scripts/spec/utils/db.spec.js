"use strict";

/**
 * Ensures that audit dates are instances of Date.
 *
 * @param {Object} obj, the audited object to fix.
 *
 * @return {Object} The fixed object.
 */
var fixObjectDates = function(obj) {
  obj.updated = new Date(obj.updated);
  obj.created = new Date(obj.created);
  return obj;
};

describe("db", function() {
  const fs = require("fs");
  const path = require("path");
  const proxyquire = require("proxyquire");
  const _ = require("lodash");

  const utils = require(path.resolve("src/utils/utils"));
  const cst = require(path.resolve("src/const"));

  var tests, stubs, db, config;

  beforeEach(function() {
    tests = require(path.resolve("spec/utils/testUtils"));
    stubs = tests.stubs();
    db = proxyquire(cst.DBPATH, stubs);
    config = tests.config();
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should ensure that db files are ready to be read from/written to.", function() {
    // deps
    const fsx = require("fs-extra");

    // setup
    var rndDirPath = path.resolve(
      require("os").tmpdir(),
      Math.random()
        .toString(36)
        .slice(-5)
    );
    var extraConfig = {};
    extraConfig.getArtifactDependenciesConfigPath = function() {
      return path.resolve(rndDirPath, "foo.json");
    };
    var stubs = tests.stubs(null, extraConfig);
    const db = proxyquire(cst.DBPATH, stubs);

    // replay
    db.getAllArtifactDependencies();

    // verif
    expect(
      fs.existsSync(extraConfig.getArtifactDependenciesConfigPath())
    ).toBeTruthy();

    // after
    fsx.removeSync(rndDirPath);
  });

  it("should overwrite artifact build params.", function() {
    // setup
    var artifactKey =
      "net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT";
    var buildParams = {
      projectType: "distribution",
      repoUrl: "https://github.com/mekomsolutions/openmrs-distro-cambodia",
      branchName: "master"
    };

    var allParams = JSON.parse(
      fs.readFileSync(config.getArtifactsBuildParamsDbPath(), "utf8")
    );
    var existingParams = utils.findObject(
      { artifactKey: artifactKey },
      allParams
    );

    // replay
    db.saveArtifactBuildParams(artifactKey, buildParams);

    // verif
    var allParams = JSON.parse(
      fs.readFileSync(config.getArtifactsBuildParamsDbPath(), "utf8")
    );
    var updatedParams = utils.findObject(
      { artifactKey: artifactKey },
      allParams
    );

    expect(existingParams["buildParams"]["branchName"]).toEqual("INFRA-111");
    expect(updatedParams["buildParams"]["branchName"]).toEqual("master");
    expect(updatedParams.updated).toBeGreaterThan(existingParams.updated);
  });

  it("should save new artifact build params.", function() {
    // setup
    var artifactKey =
      "org.globalhealthcoalition|openmrs-distro-haiti|1.0.0-SNAPSHOT";
    var buildParams = {
      projectType: "distribution",
      repoUrl: "https://github.com/globalhealthcoalition/openmrs-distro-haiti",
      branchName: "master"
    };

    var allParams = JSON.parse(
      fs.readFileSync(config.getArtifactsBuildParamsDbPath(), "utf8")
    );
    var existingParams = utils.findObject(
      { artifactKey: artifactKey },
      allParams
    );

    // replay
    db.saveArtifactBuildParams(artifactKey, buildParams);

    // verif
    var allParams = JSON.parse(
      fs.readFileSync(config.getArtifactsBuildParamsDbPath(), "utf8")
    );
    var createdParams = utils.findObject(
      { artifactKey: artifactKey },
      allParams
    );

    expect(_.isEmpty(existingParams)).toBeTruthy();
    expect(createdParams["buildParams"]["projectType"]).toEqual("distribution");
    expect(createdParams["buildParams"]["branchName"]).toEqual("master");
    expect(createdParams["buildParams"]["repoUrl"]).toEqual(
      "https://github.com/globalhealthcoalition/openmrs-distro-haiti"
    );
  });

  it("should delete artifact build params.", function() {
    // setup
    var artifactKey =
      "net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT";

    var allParams = JSON.parse(
      fs.readFileSync(config.getArtifactsBuildParamsDbPath(), "utf8")
    );
    var existingParams = utils.findObject(
      { artifactKey: artifactKey },
      allParams
    );

    // replay
    db.saveArtifactBuildParams(artifactKey, null);

    // verif
    var allParams = JSON.parse(
      fs.readFileSync(config.getArtifactsBuildParamsDbPath(), "utf8")
    );

    expect(_.isEmpty(existingParams)).not.toBeTruthy();
    expect(utils.findObject({ artifactKey: artifactKey }, allParams)).toEqual(
      {}
    );
  });

  it("should save a new instance definition.", function() {
    // setup
    var instances = {};
    var instance = JSON.parse(
      fs.readFileSync(
        path.resolve(
          "spec/instance-event/resources/test_instance_definition_2.json"
        ),
        "utf8"
      )
    );

    // pre-verif
    instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    expect(
      utils.findObject({ uuid: instance.uuid, name: instance.name }, instances)
    ).toEqual({});

    // replay
    instance = db.saveInstanceDefinition(
      instance,
      "status: saving new instance"
    );

    // verif
    instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    var actualInstance = fixObjectDates(
      utils.findObject({ uuid: instance.uuid, name: instance.name }, instances)
    );

    expect(actualInstance).toEqual(instance);
  });


  it("should update an instance definition.", function() {
    // setup
    var instances = {};
    var instance = JSON.parse(
      fs.readFileSync(
        path.resolve(
          "spec/instance-event/resources/test_instance_definition_1.json"
        ),
        "utf8"
      )
    );

    // pre-verif
    instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    var beforeInstance = utils.findObject(
      { uuid: instance.uuid, name: instance.name },
      instances
    );
    expect(beforeInstance).not.toEqual({});
    expect(beforeInstance).not.toEqual(instance);

    // replay
    instance = db.saveInstanceDefinition(instance, "status: updating instance");

    // verif
    instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    var actualInstance = fixObjectDates(
      utils.findObject({ uuid: instance.uuid, name: instance.name }, instances)
    );

    expect(actualInstance).toEqual(
      fixObjectDates(Object.assign(beforeInstance, instance))
    );
  });

  it("should delete an instance definition.", function() {
    // setup
    var instances = {};
    var instance = JSON.parse(
      fs.readFileSync(
        path.resolve(
          "spec/instance-event/resources/test_instance_definition_1.json"
        ),
        "utf8"
      )
    );

    // pre-verif
    instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    var instance = utils.findObject(
      { uuid: instance.uuid, name: instance.name },
      instances
    );
    expect(instance).not.toEqual({});

    // replay
    db.deleteInstanceDefinition(instance.uuid);

    // verif
    instances = JSON.parse(
      fs.readFileSync(config.getInstancesConfigPath(), "utf8")
    );
    expect(
      utils.findObject({ uuid: instance.uuid, name: instance.name }, instances)
    ).toEqual({});
  });
});
