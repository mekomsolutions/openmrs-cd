"use strict";

describe("Commons for project builds", function() {
  const fs = require("fs");
  const path = require("path");

  const utils = require(path.resolve("src/utils/utils"));
  const config = require(path.resolve("src/utils/config"));
  const model = require(path.resolve("src/utils/model"));

  const cmns = require(path.resolve(
    "src/" + config.getJobNameForPipeline1() + "/commons"
  ));

  it("should generate a typical Maven build script.", function() {
    // replay
    var script = utils.getScriptAsString(
      cmns.getMavenProjectBuildScript("project_type")
    );

    // verif
    expect(script).toContain("#!/bin/bash\n");
    expect(script).toContain(
      "# Autogenerated script to build projects of type 'project_type'...\n"
    );
    expect(script).toContain("mvn clean install\n");

    // verify that passing a profile is correctly handled
    expect(
      utils.getScriptAsString(
        cmns.getMavenProjectBuildScript("project_type", "profile1")
      )
    ).toContain("mvn clean install -P profile1\n");
  });

  it("should generate a typical Maven deploy script.", function() {
    // replay
    var script = utils.getScriptAsString(
      cmns.getMavenProjectDeployScript("project_type", "URL_ENVVAR_NAME")
    );

    // verif
    expect(script).toContain("#!/bin/bash\n");
    expect(script).toContain(
      "# Autogenerated script to deploy projects of type 'project_type'...\n"
    );
    expect(script).toContain("nexus_envvars=$1 ; . $nexus_envvars\n");
    expect(script).toContain(
      "mvn clean deploy -DskipTests -DaltDeploymentRepository=${NEXUS_REPO_ID}::default::${URL_ENVVAR_NAME}\n"
    );

    // verify that passing a profile is correctly handled
    expect(
      utils.getScriptAsString(
        cmns.getMavenProjectDeployScript(
          "project_type",
          "URL_ENVVAR_NAME",
          "profile1"
        )
      )
    ).toContain("mvn clean deploy -DskipTests -P profile1");
  });

  it("should generate an 'Artifact' for a Maven project.", function() {
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
    var artifact = cmns.getMavenProjectArtifact(pom, "./target", "omod");

    // verif
    expect(artifact instanceof model.Artifact).toBeTruthy();
    expect(artifact.name).toEqual("exti18n");
    expect(artifact.version).toEqual("1.1.0-SNAPSHOT");
    expect(artifact.buildPath).toEqual("./target");
    expect(artifact.filename).toEqual("exti18n-1.1.0-SNAPSHOT.omod");
    expect(artifact.extension).toEqual("omod");
    expect(artifact.destFilename).toEqual(artifact.filename);

    expect(artifact.mavenProject instanceof model.MavenProject).toBeTruthy();
    expect(artifact.mavenProject.groupId).toEqual("org.openmrs.module");
    expect(artifact.mavenProject.artifactId).toEqual(artifact.name);
    expect(artifact.mavenProject.version).toEqual(artifact.version);
    expect(artifact.mavenProject.packaging).toEqual(artifact.extension);
  });

  it("should default to 'default' project type", function () {
    var varName = config.varProjectType;
    var prev = process.env[config.varProjectType()]

    process.env[config.varProjectType()] = "someValue"
    expect(cmns.getProjectType()).toEqual("someValue");

    process.env[config.varProjectType()] = "";
    expect(cmns.getProjectType()).toEqual("default");

    // clean up
    process.env[config.varProjectType()] = prev;
  });

  it("should save a file with all downstream builds parameters to rebuild impacted artifacts.", function() {
    // deps
    const proxyquire = require("proxyquire");
    const tests = require(path.resolve("spec/utils/testUtils"));
    const mockCmns = proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline1() + "/commons"),
      tests.stubs()
    );

    // setup
    const projectType = "bahmnicore";
    var pom = utils.getPom(
      "spec/" +
        config.getJobNameForPipeline1() +
        "/resources/" +
        projectType +
        "/pom.xml"
    );
    var artifactsIds = ["bahmnicore-api", "bahmnicore-omod"];

    // replay
    mockCmns.mavenPostBuildActions(pom.groupId, artifactsIds, pom.version);

    // verif
    var buildParams = JSON.parse(
      fs.readFileSync(config.getDownstreamBuildParamsJsonPath(), "utf-8")
    );
    expect(buildParams.length).toEqual(1);
    var params = buildParams[0];
    expect(params.projectType).toEqual("distribution");
    expect(params.repoUrl).toEqual(
      "https://github.com/mekomsolutions/openmrs-distro-cambodia"
    );
    expect(params.branchName).toEqual("INFRA-111");

    // after
    tests.cleanup();
  });
});
