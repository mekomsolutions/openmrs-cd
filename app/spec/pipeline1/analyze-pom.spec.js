"use strict";

describe("POM post-analysis", function() {
  const fs = require("fs");
  const path = require("path");
  const proxyquire = require("proxyquire");

  it("should analyze and process distributions POM files.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));

    // setup
    const stubs = tests.stubs();
    const config = tests.config();

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

    // after
    tests.cleanup();
  });
});
