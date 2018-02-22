"use strict";

const XML = require("pixl-xml");
const fs = require("fs");
const log = require("npmlog");
const _ = require("lodash");

/**
 * https://gist.github.com/penguinboy/762197
 */
var flattenObject = function(ob) {
  var toReturn = {};

  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if (typeof ob[i] == "object") {
      var flatObject = flattenObject(ob[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + "_" + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
};

module.exports = {
  /**
   * @return Returns a concatenated string of all the properties of the passed object
   */
  convertToEnvVar: function(object) {
    var envvars = "";
    var flat = flattenObject(object);
    for (var property in flat) {
      if (flat.hasOwnProperty(property)) {
        envvars = envvars + property + "=" + flat[property] + "\n";
      }
    }
    return envvars;
  },

  getPom: function(pomPath) {
    var file = fs.readFileSync(pomPath + "pom.xml", "utf8");
    var parsedPom = XML.parse(file);

    return parsedPom;
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
    var string = "";
    if (script != null) {
      string = script.type;
      string = string + "\n\n";
      string = string + script.comments;
      string = string + "\n\n";
      string = string + script.value;
    }
    return string;
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
  }
};
