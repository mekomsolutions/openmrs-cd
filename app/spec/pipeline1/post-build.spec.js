"use strict";

describe("Post build", function() {
  const fs = require("fs");
  const path = require("path");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  it("should analyze and process distributions POM files.", function() {
    const tests = require(path.resolve("spec/utils/testUtils"));

    // setup
    var extraConfig = {};
    extraConfig.getBuildPomPath = function() {
      return path.resolve(
        "spec/" +
          config.getJobNameForPipeline1() +
          "/resources/distribution/pom.xml"
      );
    };

    var config = require(path.resolve("src/utils/config"));

    process.env[config.varProjectType()] = "distribution";
    const stubs = tests.stubs(null, extraConfig, {
      "./impl/distribution": path.resolve(
        "src/" +
          config.getJobNameForPipeline1() +
          "/impl/" +
          process.env[config.varProjectType()]
      )
    });
    config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env[config.varRepoUrl()] =
      "https://github.com/mekomsolutions/openmrs-distro-cambodia";
    process.env[config.varRepoName()] = "openmrs-distro-cambodia";
    process.env[config.varBranchName()] = "master";

    // replay
    proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline1() + "/post-build.js"),
      stubs
    );

    // verif
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
    expect(params[config.varRepoName()]).toEqual("openmrs-distro-cambodia");
    expect(params[config.varBranchName()]).toEqual("master");

    // after
    tests.cleanup();
  });

  it("should analyze and process Bahmni Core POM files.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));

    // setup
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

    process.env[config.varProjectType()] = "bahmnicore";
    const stubs = tests.stubs(null, extraConfig, {
      "../commons": path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/commons"
      ),
      "./impl/bahmnicore": path.resolve(
        "src/" +
          config.getJobNameForPipeline1() +
          "/impl/" +
          process.env[config.varProjectType()]
      )
    });
    config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env[config.varRepoUrl()] =
      "https://github.com/mekomsolutions/bahmni-core";
    process.env[config.varRepoName()] = "bahmni-core";
    process.env[config.varBranchName()] = "master";

    // replay
    proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline1() + "/post-build.js"),
      stubs
    );

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
    expect(params.repoName).toEqual("openmrs-distro-cambodia");
    expect(params.branchName).toEqual("INFRA-111");

    // after
    tests.cleanup();
  });

  it("should analyze and process Bahmni Apps.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));

    // setup
    var extraConfig = {};
    extraConfig.getBuildArtifactJsonPath = function() {
      return path.resolve(
        "spec/" + config.getJobNameForPipeline1() + "/resources",
        "bahmniapps/test_artifact_bahmniapps.json"
      );
    };
    var config = require(path.resolve("src/utils/config"));

    process.env[config.varProjectType()] = "bahmniapps";
    const stubs = tests.stubs(null, extraConfig, {
      "../commons": path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/commons"
      ),
      "./impl/bahmniapps": path.resolve(
        "src/" +
          config.getJobNameForPipeline1() +
          "/impl/" +
          process.env[config.varProjectType()]
      )
    });
    config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    process.env[config.varProjectType()] = "bahmniapps";
    process.env[config.varRepoUrl()] =
      "https://github.com/mekomsolutions/openmrs-module-bahmniapps";
    process.env[config.varRepoName()] = "openmrs-module-bahmniapps";
    process.env[config.varBranchName()] = "master";

    // replay
    proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline1() + "/post-build.js"),
      stubs
    );

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
    expect(params.repoName).toEqual("openmrs-distro-cambodia");
    expect(params.branchName).toEqual("INFRA-111");

    // after
    tests.cleanup();
  });
});
