"use strict";

describe("Tests suite for pipeline3", function() {
  const fs = require("fs");
  const path = require("path");

  const config = require(path.resolve("src/utils/config"));

  const folderInTest = path.resolve("src/" + config.getJobNameForPipeline3());

  it("should verify job parameters.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;

    // replay
    var jenkinsFile = fs.readFileSync(
      __rootPath__ +
        "/../jenkins/jenkins_home/jobs/" +
        config.getJobNameForPipeline3() +
        "/config.xml",
      "utf8"
    );

    // verif
    expect(jenkinsFile).toContain(
      "<name>" + config.varInstanceUuid() + "</name>"
    );
    expect(jenkinsFile).toContain(
      "<name>" + config.varArtifactsChanges() + "</name>"
    );
    expect(jenkinsFile).toContain(
      "<name>" + config.varDeploymentChanges() + "</name>"
    );
    expect(jenkinsFile).toContain(
      "<name>" + config.varDataChanges() + "</name>"
    );
    expect(jenkinsFile).toContain("<name>" + config.varCreation() + "</name>");
    expect(jenkinsFile).toContain(
      "<scriptPath>jenkins/pipelines/" +
        config.getJobNameForPipeline3() +
        ".jenkinsfile</scriptPath>"
    );
  });

  it("should verify pipeline steps scripts.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;

    // replay
    var jenkinsFile = fs.readFileSync(
      __rootPath__ +
        "/../jenkins/pipelines/" +
        config.getJobNameForPipeline3() +
        ".jenkinsfile",
      "utf8"
    );

    // verif 'pre-host prepare' stage
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getPrehostPrepareJsScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getPrehostPrepareScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );

    // verif 'host prepare' stage
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getHostPrepareJsScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getHostPrepareScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );

    // verif 'start instance' stage
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getStartInstanceJsScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStartInstanceScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );
  });
});
