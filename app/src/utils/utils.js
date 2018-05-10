"use strict";

const path = require("path");
const fs = require("fs");
const log = require("npmlog");
const _ = require("lodash");
const XML = require("pixl-xml");

const model = require("../utils/model");

module.exports = {
  /**
   * Based on the Maven model where an artifact belongs to a group and is given a version,
   * this method builds a unique 'artifact key'.
   * Examples:  "org.openmrs.module|uicommons-omod|2.3.0"
   *            "net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT"
   *            "net.mekomsolutions|bahmniapps|a63f511"
   */
  toArtifactKey: function(groupId, artifactId, version) {
    return groupId + "|" + artifactId + "|" + version;
  },

  /**
   * Reverses toArtifactKey, see above.
   */
  fromArtifactKey: function(artifactKey) {
    if (_.isEmpty(artifactKey)) {
      throw new Error("Illegal argument: empty artifact key.");
    }
    var parts = artifactKey.split("|");
    if (parts.length !== 3) {
      throw new Error("Illegal argument: malformed artifact key.");
    }
    var pom = {
      groupId: parts[0],
      artifactId: parts[1],
      version: parts[2]
    };
    return pom;
  },

  escapeForEnvVars: function(str) {
    return str
      .replace(/(\s+)/g, "\\$1")
      .replace(/-/g, "\\-")
      .replace(/:/g, "\\:");
  },

  /**
   * https://gist.github.com/penguinboy/762197
   */
  flattenObject: function(ob) {
    var toReturn = {};

    for (var i in ob) {
      if (!ob.hasOwnProperty(i)) continue;

      if (typeof ob[i] == "object") {
        var flatObject = module.exports.flattenObject(ob[i]);
        for (var x in flatObject) {
          if (!flatObject.hasOwnProperty(x)) continue;

          toReturn[i + "_" + x] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn;
  },

  /**
   * @return Returns a concatenated string of all the object's properties.
   */
  convertToEnvVar: function(object) {
    var envvars = "";
    var flat = module.exports.flattenObject(object);
    for (var property in flat) {
      if (flat.hasOwnProperty(property)) {
        envvars +=
          property +
          "=" +
          module.exports.escapeForEnvVars(flat[property]) +
          "\n";
      }
    }
    return envvars;
  },

  getPom: function(pomFilePath) {
    var pom = {}; // the JSON rep. of the main XML POM
    try {
      pom = XML.parse(fs.readFileSync(pomFilePath, "utf-8"));
    } catch (err) {
      log.warn(
        "",
        "The main POM file could not be parsed, or was not found, is this not a Maven project?"
      );
      log.warn("", JSON.stringify(err, null, 2));
    }
    return pom;
  },

  /*
   * Saves an instance event to the database.
   *
   * @param {Object/model.Script} script - The script object.
   *
   * @return A stringified version of the script ready to be written to file.
   */
  getScriptAsString: function(script) {
    if (script instanceof model.Script !== true) {
      throw new Error("Illegal argument: must be a script object.");
    }

    const LINE_BREAKS = "\n\n";

    var asString = "";
    if (_.isString(script.type) && script.type !== "") {
      asString += script.type;
      asString += LINE_BREAKS;
    }
    if (_.isString(script.headComment) && script.headComment !== "") {
      asString += script.headComment;
      asString += LINE_BREAKS;
    }
    if (_.isString(script.body) && script.body !== "") {
      asString += script.body;
    } else {
      asString = asString.replace(new RegExp(LINE_BREAKS + "$"), "finish"); // https://stackoverflow.com/a/2729681/321797
    }
    return asString;
  },

  /**
   * Sets a status to an object, with basic audit information alongside it.
   *
   * @param {Object} objWithStatus, the object that should be set a status
   * @param {Object} status, the status object to set (could be a simple String of course)
   *
   */
  setObjectStatus: function(objWithStatus, status) {
    if (!_.isObject(objWithStatus)) {
      return;
    }

    if (!_.isEmpty(status)) {
      objWithStatus.status = status;
    }

    objWithStatus.updated = new Date();
    if (!objWithStatus.created) {
      objWithStatus.created = objWithStatus.updated;
    }
  },

  /**
   * Finds an object in a list based on 'primary key' properties values.
   *
   * @param {Object} keyPairs - The key-value map of primary key properties.
   *    Eg. {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011"} or {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011", "name": "my-new-object-1"}
   * @param {Array} objects - The list of objects to search.
   */
  findObject: function(keyPairs, objects) {
    var filteredObjects = _.filter(objects, function(o) {
      var found = false;
      var results = [];
      Object.keys(keyPairs).forEach(function(keyName) {
        var keyVal = keyPairs[keyName];
        if (_.isEmpty(keyVal)) {
          results.push(false);
          log.error(
            "",
            "An empty search key was provided preventing an object match."
          );
        }
        results.push(o[keyName] == keyVal);
      })
      results.forEach(function(item) {
        if (results[0] != item) {
          throw new Error(
            "Illegal state: provided search keys were partially matched on the target objects"
          );
        }
        found = item;
      });
      return found;
    });

    var matchedObject = {};
    if (filteredObjects.length > 1) {
      throw new Error(
        "Illegal state: multiple objects matching the search keys"
      );
    }
    if (filteredObjects.length == 1) {
      matchedObject = filteredObjects[0];
    }
    return matchedObject;
  },

  /**
   * Deletes an object from a list based on 'primary key' properties values.
   *
   * @param {Object} keyPairs - The key-value map of primary key properties.
   *    Eg. {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011"} or {"uuid": "9f6abb06-895a-479b-b4d6-fd1111aef011", "name": "my-new-object-1"}
   * @param {Array} objects - The list of objects to be amended.
   */
  removeObject: function(keyPairs, objects) {
    objects = _.reject(objects, function(o) {
      var found = true;

      Object.keys(keyPairs).forEach(function(keyName) {
        var keyVal = keyPairs[keyName];
        if (_.isEmpty(keyVal)) {
          found = false;
          log.error(
            "",
            "An empty search key was provided preventing an object match."
          );
        }
        found &= o[keyName] == keyVal;
      });

      return found;
    });

    return objects;
  }
};
