"use strict";
describe("Tests suite for Pipeline1 ", function() {
  it("should implement all required functions from model", function() {
    var folderInTest = __dirname + "/../../src/pipeline1/";

    const fs = require("fs");
    const model = require(__dirname + "/../../src/models/model");
    const modelTestUtils = require(__dirname + "/../models/modelTestUtils");

    // Running tests on each file present in the  folderInTest folder and ensure they correctly implement every needed function
    fs.readdirSync(folderInTest + "impl/").forEach(file => {
      var type = file.split(".")[0];
      var projectBuild = new require(
        folderInTest + "impl/" + type
      ).getInstance();

      modelTestUtils.ensureImplmentedFunctions(
        projectBuild,
        model.ProjectBuild
      );

      var metadata = {
        commit: 123456
      };

      var artifact = projectBuild.getArtifact(
        __dirname + "/resources/" + type + "/",
        metadata
      );

      modelTestUtils.ensureImplmentedFunctions(artifact, model.Artifact);
    });
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmniapps'", function() {
    var projectBuildType = "bahmniapps";
    var folderInTest = __dirname + "/../../src/pipeline1/";
    var projectBuild = require(folderInTest +
      "./impl/" +
      projectBuildType).getInstance();

    var mockMetadata = {
      branch: "dev",
      commit: "12fe45"
    };

    var artifact = projectBuild.getArtifact("./", mockMetadata);
    expect(artifact.project.name).toEqual("bahmniapps");
    expect(artifact.project.version).toEqual("dev");
    expect(artifact.project.module).toEqual("");
    expect(artifact.project.groupId).toEqual("");

    expect(artifact.extension).toEqual("zip");
    expect(artifact.path).toEqual("./ui/target");

    mockMetadata.branch = "";
    artifact = projectBuild.getArtifact("./", mockMetadata);
    expect(artifact.project.version).toEqual("12fe45");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(buildScript.value.indexOf("/scripts/package.sh\n") > -1);

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn deploy:deploy-file") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmniconfig'", function() {
    var projectBuildType = "bahmniconfig";
    var folderInTest = __dirname + "/../../src/pipeline1/";
    var projectBuild = require(folderInTest +
      "./impl/" +
      projectBuildType).getInstance();

    var artifact = projectBuild.getArtifact(
      __dirname + "/resources/" + projectBuildType + "/",
      null
    );
    expect(artifact.project.name).toEqual("bahmni-config-cambodia");
    expect(artifact.project.version).toEqual("1.0-SNAPSHOT");
    expect(artifact.project.module).toEqual("");
    expect(artifact.project.groupId).toEqual("net.mekomsolutions");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrsconfig'", function() {
    var projectBuildType = "openmrsconfig";
    var folderInTest = __dirname + "/../../src/pipeline1/";
    var projectBuild = require(folderInTest +
      "./impl/" +
      projectBuildType).getInstance();

    var artifact = projectBuild.getArtifact(
      __dirname + "/resources/" + projectBuildType + "/",
      null
    );
    expect(artifact.project.name).toEqual("openmrs-config-cambodia");
    expect(artifact.project.version).toEqual("1.0-SNAPSHOT");
    expect(artifact.project.module).toEqual("");
    expect(artifact.project.groupId).toEqual("net.mekomsolutions");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrscore'", function() {
    var projectBuildType = "openmrscore";
    var folderInTest = __dirname + "/../../src/pipeline1/";
    var projectBuild = require(folderInTest +
      "./impl/" +
      projectBuildType).getInstance();

    var artifact = projectBuild.getArtifact(
      __dirname + "/resources/" + projectBuildType + "/",
      null
    );
    expect(artifact.project.name).toEqual("openmrs");
    expect(artifact.project.version).toEqual("2.2.0-SNAPSHOT");
    expect(artifact.project.module).toEqual("webapp");
    expect(artifact.project.groupId).toEqual("org.openmrs");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrsmodule'", function() {
    var projectBuildType = "openmrsmodule";
    var folderInTest = __dirname + "/../../src/pipeline1/";
    var projectBuild = require(folderInTest +
      "./impl/" +
      projectBuildType).getInstance();

    var artifact = projectBuild.getArtifact(
      __dirname + "/resources/" + projectBuildType + "/",
      null
    );
    expect(artifact.project.name).toEqual("exti18n");
    expect(artifact.project.version).toEqual("1.1.0-SNAPSHOT");
    expect(artifact.project.module).toEqual("omod");
    expect(artifact.project.groupId).toEqual("org.openmrs.module");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });
});
