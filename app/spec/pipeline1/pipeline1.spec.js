"use strict";
describe("Tests suite for Pipeline1 ", function() {
  it("should generate build and deploy scripts.", function() {
    // deps
    const proxyquire = require("proxyquire");
    const model = require(__dirname + "/../../src/models/model");
    const os = require("os");
    const fs = require("fs");

    // setup
    process.env.projectType = "artifact_type";
    process.env.WORKSPACE = os.tmpdir();

    const buildScript = "__build_script__";
    const deployScript = "__deploy_script__";
    var mockBuild = new model.ProjectBuild();
    mockBuild.getBuildScriptAsString = function() {
      return buildScript;
    };
    mockBuild.getDeployScriptAsString = function(project) {
      return deployScript;
    };

    var stubs = {};
    stubs["./impl/" + process.env.projectType] = {
      getInstance: function() {
        return mockBuild;
      },
      "@noCallThru": true
    };

    // replay
    proxyquire(__dirname + "/../../src/pipeline1/build.js", stubs);

    // verif
    expect(
      fs.readFileSync(process.env.WORKSPACE + "/build.sh", "utf8")
    ).toEqual(buildScript);
    expect(
      fs.readFileSync(process.env.WORKSPACE + "/deploy.sh", "utf8")
    ).toEqual(deployScript);
  });

  it("should implement all required functions from model.", function() {
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

      modelTestUtils.ensureImplementedFunctions(
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

      modelTestUtils.ensureImplementedFunctions(artifact, model.Artifact);
    });
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmniapps'.", function() {
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
    expect(artifact.filename).toEqual("bahmniapps.zip");
    expect(artifact.destFilename).toEqual("bahmniapps-dev.zip");
    expect(artifact.path).toEqual("./ui/target");

    mockMetadata.branch = "";
    artifact = projectBuild.getArtifact("./", mockMetadata);
    expect(artifact.destFilename).toEqual("bahmniapps-12fe45.zip");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(buildScript.value.indexOf("/scripts/package.sh\n") > -1);

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn deploy:deploy-file") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'bahmniconfig'.", function() {
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

    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual(
      "bahmni-config-cambodia-1.0-SNAPSHOT.zip"
    );
    expect(artifact.destFilename).toEqual(
      "bahmni-config-cambodia-1.0-SNAPSHOT.zip"
    );
    expect(artifact.path).toEqual("./target");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrsconfig'.", function() {
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

    expect(artifact.extension).toEqual("zip");
    expect(artifact.filename).toEqual(
      "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
    );
    expect(artifact.destFilename).toEqual(
      "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
    );
    expect(artifact.path).toEqual("./target");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrscore'.", function() {
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

    expect(artifact.extension).toEqual("omod");
    expect(artifact.filename).toEqual("openmrs-2.2.0-SNAPSHOT.omod");
    expect(artifact.destFilename).toEqual("openmrs-2.2.0-SNAPSHOT.omod");
    expect(artifact.path).toEqual("./omod/target");

    var buildScript = projectBuild.getBuildScript();
    expect(buildScript.type).toEqual("#!/bin/bash");
    expect(buildScript.value).toEqual("mvn clean install\n");

    var deployScript = projectBuild.getDeployScript(artifact);
    expect(deployScript.type).toEqual("#!/bin/bash");
    expect(true).toBe(
      deployScript.value.indexOf("mvn clean deploy -DskipTests") > -1
    );
  });

  it("should getArtifact, getBuildScript and getDeployScript for 'openmrsmodule'.", function() {
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

    expect(artifact.extension).toEqual("omod");
    expect(artifact.filename).toEqual("exti18n-1.1.0-SNAPSHOT.omod");
    expect(artifact.destFilename).toEqual("exti18n-1.1.0-SNAPSHOT.omod");
    expect(artifact.path).toEqual("./omod/target");

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
