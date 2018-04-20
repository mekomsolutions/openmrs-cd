"use strict";

module.exports = {
  /*
   * Generates a script that fetches an instance's artifacts to save them a specified location.
   * 
   * @param {object} artifact - An 'artifact' section of the artifacts part of the instance definition.
   * @param {string} destPath - The destination part where to save the fecthed artifact.
   */
  getFetchArtifactScript: function(artifact, destPath) {
    var script = "";

    script += "mkdir -p " + destPath;
    script += "\n";
    script += "rm -rf " + destPath + "/*";
    script += "\n";

    if (artifact.type === "maven") {
      script +=
        "mvn dependency:unpack" +
        " " +
        "-Dartifact=" +
        artifact.value.groupId +
        ":" +
        artifact.value.artifactId +
        ":" +
        artifact.value.version +
        ":" +
        artifact.value.packaging +
        " " +
        "-DoutputDirectory=" +
        destPath;
      script += "\n";
    }

    return script;
  }
};
