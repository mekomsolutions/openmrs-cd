"use strict";

const path = require("path");
const fs = require("fs");
const log = require("npmlog");
const _ = require("lodash");
const XML = require("pixl-xml");
const YAML = require("js-yaml");

const model = require("../utils/model");
const config = require("./config");

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

  convertYaml: function(path) {
    var doc;
    try {
      doc = YAML.load(fs.readFileSync(path), "utf8");
    } catch (e) {
      log.warn("", "Failed to read file: '" + path + "'");
      log.warn("", JSON.stringify(e, null, 2));

      try {
        log.info("", "Trying with '.yaml' extension");
        path = path.replace(".yml", ".yaml");
        doc = YAML.load(fs.readFileSync(path), "utf8");
      } catch (e) {
        log.error("", "Failed to read file: '" + path + "'");
        log.error("", JSON.stringify(e, null, 2));
        throw e;
      }
    }
    return doc;
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
  flattenObject: function(ob, separator = "_") {
    var toReturn = {};

    for (var i in ob) {
      if (!ob.hasOwnProperty(i)) continue;

      if (typeof ob[i] == "object") {
        var flatObject = module.exports.flattenObject(ob[i], separator);
        for (var x in flatObject) {
          if (!flatObject.hasOwnProperty(x)) continue;
          toReturn[i + separator + x] = flatObject[x];
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
  convertToProperties: function(object, depthSeparator) {
    var envvars = "";
    var flat = module.exports.flattenObject(object, depthSeparator);
    for (var property in flat) {
      if (flat.hasOwnProperty(property)) {
        flat[property] = flat[property] == undefined ? "" : flat[property];
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

  /**
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
      });

      var found = results[0];
      if (!results.every(val => val === found)) {
        throw new Error(
          "Illegal state: search keys were only partially matched when searching collection"
        );
      }
      return found;
    });

    var matchedObject = {};
    if (filteredObjects.length > 1) {
      throw new Error(
        "Illegal state: search keys were matched multiple times when searching collection"
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
  },
  /**
   * Returns a random number in [0,1[ interval using Math.random() function
   */
  random: function() {
    return Math.random();
  },

  /**
   * Merges an array of objects into a single object.
   * The merge strategy is that the 'n' index element of the array will be replaced by 'n+1'
   *
   *
   *  Eg: [ {"username": "root", "password": "default"} , { "password": "765EGrgfv65" } ]
   *     returns:
   *      [ {"username": "root", "password": "765EGrgfv65" } ]
   *
   * @param {Object[]} Objects to be merged together.
   * @return {Object} The merged object.
   *
   */
  mergeObjects: function(arrayOfObjects) {
    var consolidatedObject = {};
    if (_.isEmpty(arrayOfObjects)) {
      log.error(
        "",
        "Trying to retrieve secrets from an 'undefined' raw secrets array. Did you correctly inject the environment at the pipeline 'stage' level?"
      );
    } else {
      var secrets = JSON.parse(arrayOfObjects);
      secrets.forEach(function(item) {
        consolidatedObject = Object.assign(consolidatedObject, item);
      });
    }
    return consolidatedObject;
  },

  /**
   *
   * Searches for the 'jenkinsCredentials()' string and replaces it by the value of the secret found at the provided path
   *
   * @param {Object} Object to parse through
   * @param {string} A JSON representation of secret object
   * @returns {Object} The initial passed object, but with matching secrets substituted.
   *
   */
  substituteSecrets: function(obj, secrets) {
    var jsonDataAsString = JSON.stringify(obj);

    // Match the pattern 'jenkinsCredentials()'
    var regExp = "jenkinsCredentials\\(.*?\\)";
    var matches = jsonDataAsString.matchAll(regExp);

    for (const match of matches) {
      // Return what inside the brackets
      var path = match[0]
        .match("\\(.*\\)")
        .toString()
        .replace("(", "")
        .replace(")", "");

      // Iterate through the secret object to find the value located at the given 'path'
      var secret = module.exports.jsonPathToValue(secrets, path);
      if (secret === null) {
        throw new Error(
          "Illegal state: Jenkins credentials path '" +
            path +
            "' could not be found in the secrets file."
        );
      }

      // Finally replace the first matching jsonDataAsString with the value
      jsonDataAsString = jsonDataAsString.replace(match[0], secret);
    }

    return JSON.parse(jsonDataAsString);
  },

  /**
   * Converts a string path to a value that is existing in a json object.
   *
   * @param {Object} jsonData Json data to use for searching the value.
   * @param {Object} path the path to use to find the value.
   * @returns {valueOfThePath|null}
   *
   * https://stackoverflow.com/a/34797931/11387004
   */
  jsonPathToValue: function(jsonData, path) {
    if (!(jsonData instanceof Object) || typeof path === "undefined") {
      throw "Not valid argument:jsonData:" + jsonData + ", path:" + path;
    }
    path = path.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
    path = path.replace(/^\./, ""); // strip a leading dot
    var pathArray = path.split(".");
    for (var i = 0, n = pathArray.length; i < n; ++i) {
      var key = pathArray[i];
      if (key in jsonData) {
        if (jsonData[key] !== null) {
          jsonData = jsonData[key];
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
    return jsonData;
  },

  /**
   *
   * Retrieves the build parameters from the environment.
   *
   * @param {Object} The environment.
   * @param {Object} The config - used to obtain the variable names to look for in the environment.
   *
   * @returns {Object} The build parameters
   *
   */
  getBuildParams: function(env, config) {
    var buildJobParams = _.pick(env, [
      config.varProjectType(),
      config.varRepoUrl(),
      config.varBranchName(),
      config.varArtifactsDeployment()
    ]);

    return buildJobParams;
  },

  /**
   *
   * Parses the pom object to identify dependencies. Proceeds with properties substitution too.
   *
   * @param {Object} The pom object.
   * @returns {Array} The dependencies as an array of artifact keys.
   *
   */
  parseDependencies: function(pom) {
    //  Building the list of dependencies (as artifact keys).
    var deps = [];

    if (!_.isEmpty(pom.parent)) {
      deps.push(
        module.exports.toArtifactKey(
          pom.parent.groupId,
          pom.parent.artifactId,
          pom.parent.version
        )
      );
    }

    // If the pom file has only one dependency, the XML parser will not return an array. Fix that.
    if (!Array.isArray(pom.dependencies.dependency)) {
      var dependencyAsArray = [pom.dependencies.dependency];
      pom.dependencies.dependency = dependencyAsArray;
    }
    pom.dependencies.dependency.forEach(function(dep) {
      var propKey = dep.version.substring(2).slice(0, -1); // "${foo.version}" -> "foo.version"

      var propVal = pom.properties[propKey];
      if (!_.isUndefined(propVal)) {
        // substituting the version alias, if any
        dep.version = propVal;
      }

      deps.push(
        module.exports.toArtifactKey(dep.groupId, dep.artifactId, dep.version)
      );
    });

    return deps;
  }
};
