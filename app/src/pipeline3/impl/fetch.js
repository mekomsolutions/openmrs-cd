"use strict";

module.exports = {
  getFetchArtifactsScript: function(artifacts, artifactsPath) {
    var script = "";

    script += "mkdir -p " + artifactsPath;
    script += "\n";
    script += "rm -rf " + artifactsPath + "/*";
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
        artifactsPath;
      script += "\n";
    }

    return script;
  }
};
