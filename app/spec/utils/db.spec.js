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

  it("should ensure that db files are ready to be read from/written to.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));
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
    tests.cleanup();
    fsx.removeSync(rndDirPath);
  });

  it("should overwrite artifact build params.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const db = proxyquire(cst.DBPATH, stubs);
    const config = tests.config();

    var artifactKey =
      "net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT";
    var buildParams = {
      projectType: "distribution",
      repoUrl: "https://github.com/mekomsolutions/openmrs-distro-cambodia",
      repoName: "openmrs-distro-cambodia",
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

    // after
    tests.cleanup();
  });

  it("should save new artifact build params.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const db = proxyquire(cst.DBPATH, stubs);
    const config = tests.config();

    var artifactKey =
      "org.globalhealthcoalition|openmrs-distro-haiti|1.0.0-SNAPSHOT";
    var buildParams = {
      projectType: "distribution",
      repoUrl: "https://github.com/globalhealthcoalition/openmrs-distro-haiti",
      repoName: "openmrs-distro-haiti",
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
    expect(createdParams["buildParams"]["repoName"]).toEqual(
      "openmrs-distro-haiti"
    );

    // after
    tests.cleanup();
  });

  it("should delete artifact build params.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const db = proxyquire(cst.DBPATH, stubs);
    const config = tests.config();

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

    // after
    tests.cleanup();
  });

  it("should save a new instance definition.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const db = proxyquire(cst.DBPATH, stubs);
    const config = tests.config();

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

    // after
    tests.cleanup();
  });

  it("should update an instance definition.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const db = proxyquire(cst.DBPATH, stubs);
    const config = tests.config();

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

    // after
    tests.cleanup();
  });

  it("should delete an instance definition.", function() {
    // setup
    const tests = require(path.resolve("spec/utils/testUtils"));
    var stubs = tests.stubs();
    const db = proxyquire(cst.DBPATH, stubs);
    const config = tests.config();

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

    // after
    tests.cleanup();
  });
});
