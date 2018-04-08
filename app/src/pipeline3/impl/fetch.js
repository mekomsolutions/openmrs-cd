"use strict";

module.exports = {
  /*
   * Generates a script that fetches an instance's artifacts to save them a specified location.
   * 
   * @param {object} artifacts - The 'artifacts' part of the instance definition.
   * @param {string} destPath - The destination part where to save the fecthed artifacts.
   */
  getFetchArtifactsScript: function(artifacts, destPath) {
    var script = "";

    script += "mkdir -p " + destPath;
    script += "\n";
    script += "rm -rf " + destPath + "/*";
    script += "\n";

    if (artifacts.type === "maven") {
      script +=
        "mvn dependency:unpack" +
        " " +
        "-Dartifact=" +
        artifacts.value.groupId +
        ":" +
        artifacts.value.artifactId +
        ":" +
        artifacts.value.version +
        ":" +
        artifacts.value.packaging +
        " " +
        "-DoutputDirectory=" +
        destPath;
      script += "\n";
    }

    return script;
  }
};
