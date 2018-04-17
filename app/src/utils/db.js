"use strict";

const fs = require("fs");
const path = require("path");
const log = require("npmlog");
const _ = require("lodash");
const uuid = require("uuid/v4");

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const utils = require("../utils/utils");

// Covered data domains names/desc listed here (those are used for logging only)
const DM_INSTANCES = "Instances Definitions";
const DM_DEPS = "Artifacts Dependencies";
const DM_BUILDPARAMS = "Artifacts Builds Params";

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
    var keyPairs = {};
    if (!_.isEmpty(uuid)) {
      keyPairs["uuid"] = uuid;
    }
    if (!_.isEmpty(name)) {
      keyPairs["name"] = name;
    }
    return getObject(DM_INSTANCES, config.getInstancesConfigPath(), keyPairs);
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
    var keyPairs = {
      name: instanceToSave.name,
      uuid: instanceToSave.uuid || uuid()
    };
    return saveObject(
      DM_INSTANCES,
      config.getInstancesConfigPath(),
      instanceToSave,
      keyPairs,
      false,
      status
    );
  },

  /*
   * Remove an instance definition from the database.
   *
   * @param {string} uuid - The instance definition UUID.
   */
  deleteInstanceDefinition: function(uuid) {
    var keyPairs = { uuid: uuid };
    saveObject(
      DM_INSTANCES,
      config.getInstancesConfigPath(),
      null,
      keyPairs,
      true,
      ""
    );
  },

  /*
   * Get the list of all dependencies artifact per artifact.
   *
   * @return The dependencies of each artifact as a succession of embedded lists of artifact keys.
   */
  getAllArtifactDependencies: function() {
    return getAllObjects(DM_DEPS, config.getArtifactDependenciesConfigPath());
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
    var keyPairs = { artifactKey: artifactKey };
    return getObject(
      DM_DEPS,
      config.getArtifactDependenciesConfigPath(),
      keyPairs
    );
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
    var keyPairs = { artifactKey: artifactKey };
    var wrapped = { dependencies: dependenciesToSave }; // so that it's embedded at obj["dependencies"]
    if (dependenciesToSave === null) {
      wrapped = null;
    }
    return saveObject(
      DM_DEPS,
      config.getArtifactDependenciesConfigPath(),
      wrapped,
      keyPairs,
      true,
      ""
    );
  },

  /*
   * Overwrites the last used build parameters for an artifact.
   *
   * @param {string} artifactKey - The artifact key of the artifact whose last build params are being updated (in practice: a distribution artifact.)
   * @param {array} buildParams - The build parameters.
   *
   * @return The saved build parameters.
   */
  saveArtifactBuildParams: function(artifactKey, buildParams) {
    var keyPairs = { artifactKey: artifactKey };
    var wrapped = { buildParams: buildParams }; // so that it's embedded at obj["buildParams"]
    if (buildParams === null) {
      wrapped = null;
    }
    return saveObject(
      DM_BUILDPARAMS,
      config.getArtifactsBuildParamsDbPath(),
      wrapped,
      keyPairs,
      true,
      ""
    );
  },

  /*
   * Get the last used build parameters for an artifact.
   *
   * @param {string} artifactKey - The artifact key of the artifact whose last build params are being fetched (in practice: a distribution artifact.)
   *
   * @return The build parameters.
   */
  getArtifactBuildParams: function(artifactKey) {
    var keyPairs = { artifactKey: artifactKey };
    return getObject(
      DM_BUILDPARAMS,
      config.getArtifactsBuildParamsDbPath(),
      keyPairs
    );
  }
};

/*
 * Fetches all objects for a data domain.
 *
 * @param {string} domainName - A description string for the data domain. Eg. "Instance Definitions", "Artifact Build Params", ... etc.
 * @param {string} dbFilePath - The path to the DB-file for the data domain.
 *
 * @return An array of all objects saved for the data domain.
 */
var getAllObjects = function(domainName, dbFilePath) {
  log.info(
    "",
    "Fetching all objects in the data domain '" + domainName + "'..."
  );

  var objects = JSON.parse(fs.readFileSync(dbFilePath, "utf8"));

  if (_.isEmpty(objects)) {
    log.info(
      "",
      "There are currently no objects of domain '" +
        domainName +
        "' saved in database."
    );
    objects = {};
  }

  return objects;
};

/*
 * Fetches an object based on primary keys in a data domain.
 *
 * @param {string} domainName - A description string for the data domain. Eg. "Instance Definitions", "Artifact Build Params", ... etc.
 * @param {string} dbFilePath - The path to the DB-file for the data domain.
 * @param {object} keyPairs - A key-value map primary key name <-> primary key value to identify the object to fetch.
 *    Eg. {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011"}
 *
 * @return The matched object in the data domain.
 */
var getObject = function(domainName, dbFilePath, keyPairs) {
  log.info(
    "",
    log.info(
      "",
      "Fetching an object in the data domain '" + domainName + "'..."
    )
  );
  log.info("", JSON.stringify(keyPairs, null, 2));

  var objects = getAllObjects(domainName, dbFilePath);
  var obj = utils.findObject(keyPairs, objects);

  if (_.isEmpty(obj)) {
    log.info("", "Object not found in database.");
  }

  return obj;
};

/*
 * Saves an object in a data domain.
 *
 * @param {string} domainName - A description string for the data domain. Eg. "Instance Definitions", "Artifact Build Params", ... etc.
 * @param {string} dbFilePath - The path to the DB-file for the data domain.
 * @param {object} object - A new object to save or update, null to delete an object.
 *  IMPORTANT: provide a 'null' object to delete an object identified by the key pairs.
 * @param {object} keyPairs - A key-value map primary key name <-> primary key value to identify the object to fetch.
 *    Eg. {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011"} or {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011", "name": "my-new-object-1"}
 * @param {boolean} override - Set to true to override existing objects, false to updated exisiting objects.
 * @param {string} status - An audit status. Eg. "Created".
 *
 * @return The saved/updated object in the data domain.
 */
var saveObject = function(
  domainName,
  dbFilePath,
  object,
  keyPairs,
  override,
  status
) {
  log.info("", "Saving an object in the data domain '" + domainName + "'...");

  var objects = getAllObjects(domainName, dbFilePath);
  var existingObj = utils.findObject(keyPairs, objects);
  objects = utils.removeObject(keyPairs, objects);

  if (object !== null) {
    if (!_.isEmpty(existingObj)) {
      if (override === true) {
        // we don't override primary keys and audit info
        var props = Object.keys(keyPairs);
        props.push("updated");
        props.push("created");
        props.push("status");
        existingObj = _.pick(existingObj, props);
      }
      object = Object.assign(existingObj, object);
    } else {
      Object.keys(keyPairs).forEach(function(keyName) {
        var keyVal = keyPairs[keyName];
        if (_.isEmpty(keyVal)) {
          log.error(
            "",
            "An empty search key was provided preventing the object creation:"
          );
          log.error("", JSON.stringify(keyPairs));
          throw new Error();
        }
        object[keyName] = keyVal;
      });
    }
    utils.setObjectStatus(object, status);
    objects.push(object);
  }

  fs.writeFileSync(dbFilePath, JSON.stringify(objects, null, 2));

  return object;
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
