"use strict";

describe("Tests suite for pipeline3", function() {
  const fs = require("fs");
  const path = require("path");

  const config = require(path.resolve("src/utils/config"));

  const folderInTest = path.resolve("src/" + config.getJobNameForPipeline3());

  it("should verify job parameters.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const ent = require("ent");

    // replay
    var jobConfigFile = fs.readFileSync(
      __rootPath__ +
        "/../jenkins/jenkins_home/jobs/" +
        config.getJobNameForPipeline3() +
        "/config.xml",
      "utf8"
    );
    jobConfigFile = ent.decode(jobConfigFile);

    // verif
    expect(jobConfigFile).toContain(
      "<name>" + config.varInstanceUuid() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<name>" + config.varArtifactsChanges() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<name>" + config.varDeploymentChanges() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<name>" + config.varDataChanges() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<name>" + config.varCreation() + "</name>"
    );
  });

  it("should verify pipeline steps scripts.", function() {
    // deps
    const XML = require("pixl-xml");
    const __rootPath__ = require("app-root-path").path;

    // replay
    var configXml = XML.parse(
      fs.readFileSync(
        __rootPath__ +
          "/../jenkins/jenkins_home/jobs/" +
          config.getJobNameForPipeline3() +
          "/config.xml",
        "utf-8"
      )
    );
    var pipelineScript = configXml.definition.script;

    // verif node 'naming'
    expect(pipelineScript).toContain(
      'def buildName = "${' + config.varInstanceUuid() + '}"'
    );
    expect(pipelineScript).toContain(
      "if (" +
        config.varArtifactsChanges() +
        ' == "true") { cause += "artifacts + " }'
    );
    expect(pipelineScript).toContain(
      "if (" + config.varDataChanges() + ' == "true") { cause += "data" + sep }'
    );
    expect(pipelineScript).toContain(
      "if (" +
        config.varDeploymentChanges() +
        ' == "true") { cause += "deployment" + sep }'
    );
    expect(pipelineScript).toContain(
      "if (" +
        config.varCreation() +
        ' == "true") { cause += "creation" + sep }'
    );

    // verif 'pre-host prepare' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getPrehostPrepareJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getPrehostPrepareScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );

    // verif 'host prepare' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getHostPrepareJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getHostPrepareScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );

    // verif 'maintenance on' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getMaintenanceOnJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getMaintenanceOnScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );

    // verif 'start instance' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getStartInstanceJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStartInstanceScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );

    // verif 'post start' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getPostStartJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getPostStartScriptName() +
        "'"
    );

    // verif 'startup monitoring' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getStartupMonitoringJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStartupMonitoringScriptName() +
        "'"
    );

    // verif 'maintenance on' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getMaintenanceOffJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getMaintenanceOffScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getUpdateStatusJsScriptName() +
        " $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getStatusFileName() +
        "'"
    );
  });
});
