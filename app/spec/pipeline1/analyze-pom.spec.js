"use strict";

describe("POM post-analysis", function() {
  const fs = require("fs");
  const path = require("path");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  it("should analyze and process distributions POM files.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));

    // setup
    const stubs = tests.stubs();
    const config = tests.config();
    const db = require(cst.DBPATH);

    process.env[config.varProjectType()] = "distribution";
    process.env[config.varPomFileContent()] = fs.readFileSync(
      path.resolve(
        "spec/" +
          config.getJobNameForPipeline1() +
          "/resources/distribution/pom.xml"
      ),
      "utf8"
    );

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/analyze-pom.js"
      ),
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

    // after
    tests.cleanup();
  });
});
