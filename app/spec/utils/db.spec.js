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

  const utils = require(path.resolve("src/utils/utils"));
  const cst = require(path.resolve("src/const"));
  const tests = require(path.resolve("spec/utils/testUtils"));

  it("should save a new instance definition.", function() {
    // setup
    const db = require(cst.DBPATH);
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
      utils.findInstanceInList(instance.uuid, instance.name, instances)
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
      utils.findInstanceInList(instance.uuid, instance.name, instances)
    );

    expect(actualInstance).toEqual(instance);

    // after
    tests.cleanup();
  });

  it("should update an instance definition.", function() {
    // setup
    const db = require(cst.DBPATH);
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
    var beforeInstance = utils.findInstanceInList(
      instance.uuid,
      instance.name,
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
      utils.findInstanceInList(instance.uuid, instance.name, instances)
    );

    expect(actualInstance).toEqual(Object.assign(beforeInstance, instance));

    // after
    tests.cleanup();
  });

  it("should delete an instance definition.", function() {
    // setup
    const db = require(cst.DBPATH);
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
    var instance = utils.findInstanceInList(
      instance.uuid,
      instance.name,
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
      utils.findInstanceInList(instance.uuid, instance.name, instances)
    ).toEqual({});

    // after
    tests.cleanup();
  });
});
