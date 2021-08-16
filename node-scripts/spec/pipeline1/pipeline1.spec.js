"use strict";

describe("Tests suite for pipeline1", function() {
  const fs = require("fs");
  const path = require("path");

  const utils = require(path.resolve("src/utils/utils"));
  const config = require(path.resolve("src/utils/config"));

  const folderInTest = path.resolve("src/" + config.getJobNameForPipeline1());

  it("should verify job parameters.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const ent = require("ent");

    // replay
    var jobConfigFile = fs.readFileSync(
      __rootPath__ +
        "/../jenkins/jenkins_home/jobs/" +
        config.getJobNameForPipeline1() +
        "/config.xml",
      "utf8"
    );
    jobConfigFile = ent.decode(jobConfigFile);

    // verif
    expect(jobConfigFile).toContain(
      "<name>" + config.varProjectType() + "</name>"
    );
    expect(jobConfigFile).toContain("<name>" + config.varRepoUrl() + "</name>");
    expect(jobConfigFile).toContain(
      "<name>" + config.varBranchName() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<name>" + config.varCommitId() + "</name>"
    );
    expect(jobConfigFile).toContain(
      "<name>" + config.varArtifactsDeployment() + "</name>"
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
          config.getJobNameForPipeline1() +
          "/config.xml",
        "utf-8"
      )
    );
    var pipelineScript = configXml.definition.script;

    // verif node 'naming'
    expect(pipelineScript).toContain(
      'currentBuild.displayName = "${' +
        config.varRepoUrl() +
        '}".substring("${' +
        config.varRepoUrl() +
        '}".lastIndexOf("/") + 1) + " - " + "${' +
        config.varBranchName() +
        '}"'
    );

    // verif 'checkout' stage
    expect(pipelineScript).toContain(
      "checkout scm: [$class: 'GitSCM', userRemoteConfigs: [[url: " +
        config.varRepoUrl() +
        "]], branches: [[name: " +
        config.varBranchName() +
        "]]], poll: false"
    );
    expect(pipelineScript).toContain(
      "sh 'find . -mindepth 1 -maxdepth 2 -name pom.xml -exec xmllint --xpath \"//*[local-name()=\\'project\\']/*[local-name()=\\'artifactId\\']/text()\" {} \\\\; -exec echo \\\\; > $" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getArtifactIdListFileName() +
        "'"
    );

    // verif 'build' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getBuildJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getBuildShellScriptName() +
        "'"
    );

    // verif 'deploy' stage
    expect(pipelineScript).toContain(
      "sh '$" +
        config.varEnvvarBuildPath() +
        "/" +
        config.getDeployShellScriptName() +
        " $JENKINS_HOME/" +
        config.getArtifactRepoEnvvarsName() +
        "'"
    );

    // verif 'post-build' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getPostBuildJsScriptName() +
        "'"
    );
    expect(pipelineScript).toContain(
      'def buildsParamsPath = "${env.' +
        config.varEnvvarBuildPath() +
        "}/" +
        config.getDownstreamBuildParamsJsonName() +
        '"'
    );
    expect(pipelineScript).toContain(
      "def params = readJSON file: buildsParamsPath"
    );
    expect(pipelineScript).toContain(
      "build job: '" + config.getJobNameForPipeline1() + "', wait: false"
    );
    expect(pipelineScript).toContain(
      "string(name: '" +
        config.varProjectType() +
        "', value: params[i]['" +
        config.varProjectType() +
        "'])"
    );
    expect(pipelineScript).toContain(
      "string(name: '" +
        config.varBranchName() +
        "', value: params[i]['" +
        config.varBranchName() +
        "'])"
    );
    expect(pipelineScript).toContain(
      "string(name: '" +
        config.varRepoUrl() +
        "', value: params[i]['" +
        config.varRepoUrl() +
        "'])"
    );
    expect(pipelineScript).toContain(
      "booleanParam(name: '" +
        config.varArtifactsDeployment() +
        "', value: params[i]['" +
        config.varArtifactsDeployment() +
        "'])"
    );

    // verif 'impacted instances' stage
    expect(pipelineScript).toContain(
      "sh 'node /opt/node-scripts/src/$JOB_NAME/" +
        config.getIdentifyInstancesJsScriptName() +
        "'"
    );
  });

  it("should implement all required functions from data model.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));
    const modelTestUtils = require(path.resolve("spec/models/modelTestUtils"));

    // Running tests on each file present in the  folderInTest folder and ensure they correctly implement every needed function
    fs.readdirSync(folderInTest + "/impl/").forEach(file => {
      var type = file.split(".")[0];
      var projectBuild = new require(
        folderInTest + "/impl/" + type
      ).getInstance();

      modelTestUtils.ensureImplementedFunctions(
        projectBuild,
        model.ProjectBuild
      );

      var commitMetadata = {
        branchName: "master"
      };
      var pom = {
        artifactId: "foo"
      };

      var artifact = projectBuild.getArtifact({
        pom: pom,
        commitMetadata: commitMetadata
      });

      modelTestUtils.ensureImplementedFunctions(artifact, model.Artifact);
    });
  });

  it("should getBuildScript and getDeployScript for 'default'.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    const projectType = "default";
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    var yamlConfigFile = utils.getProjectConfig(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/.ocd3.yaml"
    );
    projectBuild.projectConfigFile = yamlConfigFile;

    var commitMetadata = {
      branchName: "dev",
      commitId: "12fe45"
    };

    var artifact = projectBuild.getArtifact({
      commitMetadata: commitMetadata,
      pom: pom
    });

    // verif
    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install -B");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body).toEqual("./scripts/deploy.sh");
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmniapps'.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    const projectType = "bahmniapps";
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();

    var commitMetadata = {
      branchName: "dev",
      commitId: "12fe45"
    };

    var artifact = projectBuild.getArtifact({ commitMetadata: commitMetadata });

    // replay with branch specified
    expect(artifact.name).toEqual("bahmniapps");
    expect(artifact.version).toEqual("dev");
    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual("bahmniapps.zip");
    expect(artifact.destFilename).toEqual("bahmniapps-dev.zip");
    expect(artifact.buildPath).toEqual("./ui/target");
    expect(artifact.mavenProject).toEqual(
      new model.MavenProject("net.mekomsolutions", "bahmniapps", "dev")
    );

    // replay with no branch specified
    commitMetadata.branchName = "";
    artifact = projectBuild.getArtifact({ commitMetadata: commitMetadata });
    expect(artifact.destFilename).toEqual("bahmniapps-12fe45.zip");
    expect(artifact.mavenProject).toEqual(
      new model.MavenProject("net.mekomsolutions", "bahmniapps", "12fe45")
    );

    // verif
    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body.indexOf("/scripts/package.sh\n") > -1).toBe(true);

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn deploy:deploy-file") > -1).toBe(true);
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmniconfig'.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));
    const projectType = "bahmniconfig";

    // setup
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();

    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("bahmni-config-cambodia");
    expect(artifact.version).toEqual("1.0-SNAPSHOT");

    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual(
      "bahmni-config-cambodia-1.0-SNAPSHOT.zip"
    );
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./target");
    expect(artifact.mavenProject).toEqual(
      new model.MavenProject(
        "net.mekomsolutions",
        "bahmni-config-cambodia",
        "1.0-SNAPSHOT",
        "zip"
      )
    );

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrsconfig'.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));
    const projectType = "openmrsconfig";

    // setup
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("openmrs-config-cambodia");
    expect(artifact.version).toEqual("1.0-SNAPSHOT");
    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual(
      "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
    );
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./target");
    expect(artifact.mavenProject).toEqual(
      new model.MavenProject(
        "net.mekomsolutions",
        "openmrs-config-cambodia",
        "1.0-SNAPSHOT",
        "zip"
      )
    );

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrscore'.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));
    const projectType = "openmrscore";

    // setup
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();

    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("openmrs");
    expect(artifact.version).toEqual("2.2.0-SNAPSHOT");
    expect(artifact.extension).toEqual("war");
    expect(artifact.filename).toEqual("openmrs-2.2.0-SNAPSHOT.war");
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./webapp/target");
    expect(artifact.mavenProject).toEqual(
      new model.MavenProject("org.openmrs", "openmrs", "2.2.0-SNAPSHOT", "war")
    );

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrsmodule'.", function() {
    // setup
    const projectType = "openmrsmodule";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("exti18n");
    expect(artifact.version).toEqual("1.1.0-SNAPSHOT");
    expect(artifact.extension).toEqual("omod");
    expect(artifact.filename).toEqual("exti18n-1.1.0-SNAPSHOT.omod");
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./omod/target");

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'initializer'.", function() {
    // setup
    const projectType = "initializer";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("initializer");
    expect(artifact.version).toEqual("2.1.0-SNAPSHOT");
    expect(artifact.extension).toEqual("omod");
    expect(artifact.filename).toEqual("initializer-2.1.0-SNAPSHOT.omod");
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./omod/target");

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install -P validator\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(
      deployScript.body.indexOf("mvn clean deploy -DskipTests -P validator") >
        -1
    ).toBe(true);
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'maven'.", function() {
    // setup
    const projectType = "maven";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("initializer");
    expect(artifact.version).toEqual("2.1.0-SNAPSHOT");
    expect(artifact.destFilename).toEqual(artifact.filename);

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmnicore'.", function() {
    // setup
    const projectType = "bahmnicore";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("bahmnicore");
    expect(artifact.version).toEqual("0.91-SNAPSHOT");
    expect(artifact.extension).toEqual("omod");
    expect(artifact.filename).toEqual("bahmnicore-0.91-SNAPSHOT.omod");
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./bahmnicore-omod/target");

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install -P IT\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'distribution'.", function() {
    // setup
    const projectType = "distribution";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("openmrs-distro-cambodia");
    expect(artifact.version).toEqual("1.1.0-SNAPSHOT");
    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual(
      "openmrs-distro-cambodia-1.1.0-SNAPSHOT.zip"
    );
    expect(artifact.destFilename).toEqual(artifact.filename);
    expect(artifact.buildPath).toEqual("./target");

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("mvn clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body.indexOf("mvn clean deploy -DskipTests") > -1).toBe(
      true
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'odooaddon'.", function() {
    // setup
    const projectType = "odooaddon";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/generated-pom.xml"
    );

    // replay
    var projectBuild = require(folderInTest +
      "/impl/" +
      projectType).getInstance();
    var artifact = projectBuild.getArtifact({ pom: pom });
    var buildScript = projectBuild.getBuildScript();
    var deployScript = projectBuild.getDeployScript(artifact);

    // verif
    expect(artifact.name).toEqual("odoo_initializer");
    expect(artifact.version).toEqual("1.0-SNAPSHOT");
    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual("odoo_initializer-1.0-SNAPSHOT.zip");
    expect(artifact.destFilename).toEqual("odoo_initializer-1.0-SNAPSHOT.zip");
    expect(artifact.buildPath).toEqual("build");

    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.body).toEqual("./gradlew clean install\n");

    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(deployScript.body).toContain(
      "./gradlew publish -PrepoId=${NEXUS_REPO_ID} -Purl=${ARTIFACT_UPLOAD_URL_odooaddon}"
    );
  });
});
