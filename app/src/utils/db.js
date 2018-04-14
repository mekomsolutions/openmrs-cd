"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");
const _ = require("lodash");
const uuid = require("uuid/v4");

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const utils = require("../utils/utils");

module.exports = {
  /*
   * Gets an instance definition from database.
   *
   * @param {string} uuid - The instance definition UUID.
   * @param {string} name - The instance definition name.
   * 
   * @return {} if instance definition is not found.
   */
  getInstanceDefinition: function(uuid, name) {
    log.info(
      "",
      "Fetching the instance definition with\n\tUUID: '" +
        uuid +
        "' and\n\tname: '" +
        name +
        "'"
    );

    var instances = getAllInstanceDefinitions();
    var instanceDef = utils.findInstanceInList(uuid, name, instances);

    if (_.isEmpty(instanceDef)) {
      log.info("", "Instance definition not found in database.");
    }

    return instanceDef;
  },

  /*
   * Saves an instance definition to the database.
   *
   * @param {object} instance - The instance definition to save.
   *    This could be an partial/incomplete instance definition (eg. and 'instance event').
   *    If applicable the instance UUID will be set.
   * @param {string} status - The new instance status (for auditing).
   *
   * @return The complete updated version of the instance definition.
   */
  saveInstanceDefinition: function(instanceToSave, status) {
    log.info("", "Saving an instance definition...");
    log.info("", JSON.stringify(instanceToSave, null, 2));

    var existingInstance = module.exports.getInstanceDefinition(
      instanceToSave.uuid,
      instanceToSave.name
    );

    log.info("", JSON.stringify(existingInstance, null, 2));

    instanceToSave.uuid = existingInstance.uuid || uuid();
    utils.setObjectStatus(instanceToSave, status);

    Object.assign(existingInstance, instanceToSave); // merging / overring the existing

    var instances = getAllInstanceDefinitions();
    instances = _.reject(instances, function(el) {
      return el.uuid === existingInstance.uuid;
    });
    instances.push(existingInstance);
    fs.writeFileSync(
      config.getInstancesConfigPath(),
      JSON.stringify(instances, null, 2)
    );

    return existingInstance;
  },

  /*
   * Remove an instance definition from the database.
   *
   * @param {string} uuid - The instance definition UUID.
   * @param {string} name - The instance definition name.
   */
  deleteInstanceDefinition: function(uuid, name) {
    log.info("", "Deleting an instance definition...");
    log.info(
      "",
      "Deleting the instance definition with\n\tUUID: '" +
        uuid +
        "' and\n\tname: '" +
        name +
        "'"
    );

    var instance = module.exports.getInstanceDefinition(uuid, name);
    if (_.isEmpty(instance)) {
      log.warn("", "There was no such instance definition to delete.");
      return;
    }

    var instances = getAllInstanceDefinitions();
    instances = _.reject(instances, function(el) {
      return el.uuid === instance.uuid;
    });

    fs.writeFileSync(
      config.getInstancesConfigPath(),
      JSON.stringify(instances, null, 2)
    );
  },

  /*
   * Get the dependencies for a given artifact.
   *
   * @param {string} artifactKey - The artifact key of the artifact whose dependencies are being updated (in practice: a distribution artifact.)
   *
   * @return Its dependencies as an embedded list of artifact keys.
   *  Eg.   var deps = db.getArtifactDependencies("net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT");
   *        var depsArray = deps["dependencies"];
   */
  getArtifactDependencies: function(artifactKey) {
    log.info("", "Fetching artifacts dependencies for: " + artifactKey);

    var allDeps = getAllArtifactDependencies();

    var deps = allDeps[artifactKey];
    if (_.isUndefined(deps)) {
      log.info("", "No artifacts dependencies found for: " + artifactKey);
      deps = {};
    }

    return deps;
  },

  /*
   * Overwrites an artifact list of dependencies.
   *
   * @param {string} artifactKey - The artifact key of the artifact whose dependencies are being updated (in practice: a distribution artifact.)
   * @param {array} dependenciesToSave - The dependencies as an array of artifact keys.
   *
   * @return The saved dependencies.
   */
  saveArtifactDependencies: function(artifactKey, dependenciesToSave) {
    log.info("", "Saving artifacts dependencies for: " + artifactKey);

    var allDeps = getAllArtifactDependencies();

    var deps = module.exports.getArtifactDependencies(artifactKey);
    if (!_.isEmpty(deps)) {
      log.info(
        "",
        "Existing artifacts dependencies are being overwritten for: " +
          artifactKey
      );
    }

    deps["dependencies"] = dependenciesToSave; // complete override
    utils.setObjectStatus(deps);
    allDeps[artifactKey] = deps;

    fs.writeFileSync(
      config.getArtifactDependenciesConfigPath(),
      JSON.stringify(allDeps, null, 2)
    );

    return deps;
  }
};

/*
 * Get all instance definitions from database.
 *
 * @return {} if no instance definitions are found.
 */
var getAllInstanceDefinitions = function() {
  log.info("", "Fetching all instance definitions.");

  var instances = JSON.parse(
    fs.readFileSync(config.getInstancesConfigPath(), "utf8")
  );

  if (_.isEmpty(instances)) {
    log.warn(
      "",
      "There are currently no instance definitions saved in database."
    );
    instances = {};
  }

  return instances;
};

var getAllArtifactDependencies = function() {
  log.info("", "Fetching all artifacts dependencies.");

  var allDeps = JSON.parse(
    fs.readFileSync(config.getArtifactDependenciesConfigPath(), "utf8")
  );

  if (_.isEmpty(allDeps)) {
    log.warn(
      "",
      "There are currently no artifacts dependencies saved in database."
    );
    allDeps = {};
  }

  return allDeps;
};
