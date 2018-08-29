"use strict";

describe("Script triggering downstream builds", function() {
  const fs = require("fs");
  const path = require("path");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  var tests, utils;

  beforeEach(function() {
    tests = require(path.resolve("spec/utils/testUtils"));
    utils = require(path.resolve("src/utils/utils"));
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should save a distribution build parameters.", function() {
    //
    // setup
    //
    var extraConfig = {};
    extraConfig.getBuildPomPath = function() {
      return path.resolve(
        "spec/" +
          config.getJobNameForPipeline1() +
          "/resources/distribution/pom.xml"
      );
    };

    var config = require(path.resolve("src/utils/config"));

    const stubs = tests.stubs(null, extraConfig, {
      "./impl/distribution": path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/impl/distribution"
      )
    });
    config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env[config.varProjectType()] = "distribution";
    process.env[config.varRepoUrl()] =
      "https://github.com/mekomsolutions/openmrs-distro-cambodia";
    process.env[config.varBranchName()] = "master";

    // fitting the Maven project information to the current project type
    var pom = utils.getPom(config.getBuildPomPath());
    var artifact = {
      mavenProject: {
        groupId: pom.artifactId,
        artifactId: pom.groupId,
        version: pom.version
      }
    };
    fs.writeFileSync(
      config.getBuildArtifactJsonPath(),
      JSON.stringify(artifact, null, 2)
    );
    fs.writeFileSync(config.getArtifactIdListFilePath(), []);

    //
    // replay
    //
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/downstream-builds.js"
      ),
      stubs
    );

    //
    // verif
    //
    var deps = db.getArtifactDependencies(
      "net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT"
    );
    var depsArray = deps["dependencies"];

    expect(
      depsArray.indexOf("net.mekomsolutions|openmrs-config-cambodia|1.0.1") > -1
    ).not.toBeTruthy();
    expect(
      depsArray.indexOf("net.mekomsolutions|openmrs-config-cambodia|1.0.2") > -1
    ).toBeTruthy();
    expect(
      depsArray.indexOf("net.mekomsolutions|bahmni-config-cambodia|1.0.1") > -1
    ).not.toBeTruthy();
    expect(
      depsArray.indexOf("net.mekomsolutions|bahmni-config-cambodia|1.0.2") > -1
    ).toBeTruthy();
    expect(
      depsArray.indexOf("org.openmrs.module|initializer-omod|1.0.1") > -1
    ).toBeTruthy();

    var params = db.getArtifactBuildParams(
      "net.mekomsolutions|openmrs-distro-cambodia|1.1.0-SNAPSHOT"
    );
    params = params["buildParams"];

    expect(params[config.varProjectType()]).toEqual("distribution");
    expect(params[config.varRepoUrl()]).toEqual(
      "https://github.com/mekomsolutions/openmrs-distro-cambodia"
    );
    expect(params[config.varBranchName()]).toEqual("master");
  });

  it("should identify dependent artifacts and save their build parameters for further pipeline steps.", function() {
    //
    // setup
    //
    var extraConfig = {};
    extraConfig.getBuildPomPath = function() {
      return path.resolve(
        "spec/" +
          config.getJobNameForPipeline1() +
          "/resources/bahmnicore/pom.xml"
      );
    };
    extraConfig.getArtifactIdListFilePath = function() {
      return path.resolve(
        "spec/pipeline1/resources",
        "bahmnicore/test_artifacts_ids_1.txt"
      );
    };
    var config = require(path.resolve("src/utils/config"));

    const stubs = tests.stubs(null, extraConfig, {
      "../commons": path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/commons"
      ),
      "./impl/bahmnicore": path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/impl/bahmnicore"
      )
    });
    config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env[config.varProjectType()] = "bahmnicore";
    process.env[config.varRepoUrl()] =
      "https://github.com/mekomsolutions/bahmni-core";
    process.env[config.varBranchName()] = "master";

    // fitting the Maven project information to the current project type
    var pom = utils.getPom(config.getBuildPomPath());
    var artifact = {
      mavenProject: {
        groupId: pom.artifactId,
        artifactId: pom.groupId,
        version: pom.version
      }
    };
    fs.writeFileSync(
      config.getBuildArtifactJsonPath(),
      JSON.stringify(artifact, null, 2)
    );

    //
    // replay
    //
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/downstream-builds.js"
      ),
      stubs
    );

    //
    // verif
    //
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
  });

  it("should analyze and process Bahmni Apps.", function() {
    // TODO
  });
});
