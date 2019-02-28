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
        ' == "true") { cause += "artifacts" + sep }'
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

    // verif the 'Load Jenkins Credentials' stage
    var fetchInstance =
      "     sh 'node /opt/node-scripts/src/$JOB_NAME/" +
      config.getFetchInstanceDefJsScriptName() +
      "'\n" +
      "     def instanceDefJSON = sh (\n" +
      "      script: '$BUILD_PATH/" +
      config.getFetchInstanceDefScriptName() +
      "',\n" +
      "      returnStdout: true\n" +
      "     )\n" +
      "     def instanceDef = new JsonSlurperClassic().parseText(instanceDefJSON)";

    expect(pipelineScript).toContain(fetchInstance);

    var fetchCredentials =
      '     def filter = ["${instanceDef.group}", "${instanceDef.group}_${instanceDef.type}"]\n' +
      "     def credentials = []\n" +
      "     for (key in filter) {\n" +
      "      println \"\\033[1m\\033[34m[INFO]\\033[0m Fetching '${key}' Jenkins Credential.\"\n" +
      "      try {\n" +
      "       withCredentials([string(credentialsId: key, variable: 'SECRET')]) {\n" +
      "        credentials.push(new JsonSlurperClassic().parseText(env.SECRET))\n" +
      "        println \"\\033[1m\\033[34m[INFO]\\033[0m Sucessfully fetched '${key}' Jenkins Credential.\"\n" +
      "       }\n" +
      "      } catch (CredentialNotFoundException e) {\n" +
      "       println \"\\033[1m\\033[33m[WARN]\\033[0m '${key}' Jenkins Credential not found. Skipping.\"\n" +
      "       currentBuild.result = 'SUCCESS'\n" +
      "      }\n" +
      "     }";

    expect(pipelineScript).toContain(fetchCredentials);

    var saveSecrets =
      "jenkinsCredentials = new JsonBuilder(credentials).toPrettyString()";

    expect(pipelineScript).toContain(saveSecrets);
  });
});
