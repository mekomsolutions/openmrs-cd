"use strict";

const path = require("path");
const fs = require("fs");
const log = require("npmlog");
const _ = require("lodash");
const XML = require("pixl-xml");

const model = require("../models/model");

module.exports = {
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

  sortByArtifact: function(dependenciesByServer) {
    var dependenciesByArtifact = {};

    for (var property in dependenciesByServer) {
      if (dependenciesByServer.hasOwnProperty(property)) {
        var dependenciesForAServer =
          dependenciesByServer[property].dependencies;
        for (var i = 0; i < dependenciesForAServer.length; i++) {
          var dep = dependenciesForAServer[i];
          var key = dep.groupId + "." + dep.artifactId + "_" + dep.version;
          if (dependenciesByArtifact.hasOwnProperty(key)) {
            dependenciesByArtifact[key].push(property);
          } else {
            dependenciesByArtifact[key] = [property];
          }
        }
      }
    }
    return dependenciesByArtifact;
  },

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

  /*
   * identifies the servers that have a dependency on the 'artifact' and updates the 'history' 
   */
  setMatchingServersAndUpdateHistory: function(
    dependencies,
    history,
    serverEvent
  ) {
    var artifact = serverEvent.artifact;
    var suffix = artifact.mavenProject.module
      ? "-" + artifact.mavenProject.module
      : "";
    var key =
      artifact.mavenProject.groupId +
      "." +
      artifact.mavenProject.artifactId +
      suffix +
      "_" +
      artifact.mavenProject.version;

    var servers = module.exports.getServersByArtifactKey(dependencies, key);

    if (servers) {
      for (var server of servers) {
        if (history[server]) {
          history[server].serverEvents.push(serverEvent);
        } else {
          history[server] = {
            serverEvents: []
          };
          history[server].serverEvents.push(serverEvent);
        }
      }
    } else {
      log.warn(
        "",
        "No server was found that matches the provided artifact: " + key
      );
      console.dir(serverEvent);
    }
  },

  /**
   * Artifact keys are strings such as 'org.openmrs.module.mksreports_1.1.1-SNAPSHOT', 'org.openmrs.module.metadatasharing-omod_1.2.2', ...
   * So a concatenation of group ID + artifact ID + version.
   *
   * @param {String} serversByArtifactKeys, a map with keys=artifact keys and values=servers running affected by those artifact keys
   * @param {String} artifactKey, an artifact key to match
   *
   * @return {String Array} An array of the servers affected by the input artifact key
   */
  getServersByArtifactKey: function(serversByArtifactKeys, artifactKey) {
    var res = artifactKey.split("_");
    if (!_.isArray(res) || res.length != 2) {
      log.error(
        "",
        "Could not extract the artifact information from " + artifactKey
      );
      log.error(
        "",
        "This is an example of a valid artifact key: " +
          "org.openmrs.module.mksreports_1.1.1-SNAPSHOT"
      );
      throw new Error();
    }
    var artifact = res[0]; // that's the group id + artifact id concatenated
    var artifactVersion = res[1];

    var matchedServers = [];

    _.forOwn(serversByArtifactKeys, function(servers, serversArtifactKey) {
      var res = serversArtifactKey.split("_");
      if (!_.isArray(res) || res.length != 2) {
        log.error(
          "",
          "Could not extract the artifact information from " +
            serversArtifactKey
        );
        log.error(
          "",
          "This is an example of a valid artifact key: " +
            "org.openmrs.module.mksreports_1.1.1-SNAPSHOT"
        );
        throw new Error();
      }
      var serversArtifact = res[0];
      var serversArtifactVersion = res[1];

      if (
        serversArtifact.startsWith(artifact) &&
        serversArtifactVersion == artifactVersion
      ) {
        log.info(
          "",
          artifactKey + " was found to affect server(s): " + servers
        );
        matchedServers = _.merge(matchedServers, servers);
      }
    });

    return matchedServers;
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

    var matchedObject = {};
    if (filteredObjects.length > 1) {
      throw new Error();
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
   * Finds an instance definition in provided list of instances definitions based on the UUID or name.
   *
   * @param {String} uuid, the UUID to match
   * @param {String} name, the name to match
   *
   * @return {Object} The matched instance definition.
   */
  findInstanceInList: function(uuid, name, instances) {
    var filteredInstances = _.filter(instances, function(o) {
      return o.name === name || o.uuid === uuid;
    });

    var matchedInstance = {};
    if (filteredInstances.length > 1) {
      throw new Error(
        "Multiple matches were found for the following instance: uuid='" +
          uuid +
          "', name='" +
          name +
          "'."
      );
    }
    if (filteredInstances.length == 1) {
      matchedInstance = filteredInstances[0];
    }
    return matchedInstance;
  }
};
