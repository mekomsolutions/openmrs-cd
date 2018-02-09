var XML = require("pixl-xml");
var fs = require("fs");

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
  *
  */
  setMatchingServersAndUpdateHistory: function(
    dependencies,
    history,
    serverEvent
  ) {
    var artifact = serverEvent.artifact;
    var suffix = artifact.project.module ? "-" + artifact.project.module : "";
    var key =
      artifact.project.groupId +
      "." +
      artifact.project.name +
      suffix +
      "_" +
      artifact.project.version;
    var servers = dependencies[key];

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
      console.log("[WARN] No server found matching the provided artifact");
      console.dir(serverEvent);
      console.log("Artifact: " + key);
    }
  }
};

/**
 * https://gist.github.com/penguinboy/762197
 *
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
