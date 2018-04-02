"use strict";
describe("Test suite for webhook scripts", function() {
  const path = require("path");
  const tests = require(path.resolve("spec", "utils", "testUtils"));
  const fs = require("fs");

  it("should verify job parameters.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const config = require(path.resolve("src/utils/config"));
    const ent = require("ent");

    // replay
    var jenkinsFile = fs.readFileSync(
      path.resolve(
        __rootPath__,
        "..",
        "jenkins/jenkins_home/jobs/" +
          config.getJobNameForWebhook() +
          "/config.xml"
      ),
      "utf8"
    );
    jenkinsFile = ent.decode(jenkinsFile);

    // verif
    expect(jenkinsFile).toContain("<name>" + config.varPayload() + "</name>");
    expect(jenkinsFile).toContain(
      "<name>" + config.varProjectType() + "</name>"
    );
    expect(jenkinsFile).toContain(
      "<name>" + config.varScmService() + "</name>"
    );
    expect(jenkinsFile).toContain(
      "<command>node /opt/app/src/" + config.getWebhookJsScriptPath()
    );
    expect(jenkinsFile).toContain(
      "<propertiesFilePath>" +
        config.getCommitMetadataFileEnvvarsPath() +
        "</propertiesFilePath>"
    );
    expect(jenkinsFile).toContain(
      "<command>node /opt/app/src/" + config.getTriggerJsScriptPath()
    );
    expect(jenkinsFile).toContain(
      "<propertiesFilePath>$WORKSPACE/" +
        config.getProjectBuildTriggerEnvvarsName() +
        "</propertiesFilePath>"
    );
    expect(jenkinsFile).toContain(
      "<propertiesFile>" +
        config.getCommitMetadataFileEnvvarsPath() +
        "</propertiesFile>"
    );
    expect(jenkinsFile).toContain(
      "<projects>$" + config.varDownstreamJob() + "</projects>"
    );
    expect(jenkinsFile).toContain(
      '<macroTemplate>#${BUILD_NUMBER} - ${ENV,var="' +
        config.varRepoName() +
        '"} - ${ENV,var="' +
        config.varBranchName() +
        '"} (${ENV,var="' +
        config.varCommitId() +
        '"})</macroTemplate>'
    );
  });

  it("should parse a GitHub HTTP payload", function() {
    // setup
    var type = "github";
    var payloadParser = new require(path.resolve("src/webhook/impl/" + type));

    // replay
    var metadata = payloadParser.parsePayload(
      fs.readFileSync(__dirname + "/test_github_payload.json", "utf8")
    );

    // verif
    expect(metadata.branchName).toBe("BAHMNI-17");
    expect(metadata.commitId).toBe("ac67634");
    expect(metadata.repoUrl).toBe(
      "https://github.com/mekomsolutions/bahmni-config-cambodia"
    );
  });

  it("should pass the commit metadata as both envvars and temp JSON file.", function() {
    // deps
    const proxyquire = require("proxyquire");

    // setup
    process.env.scmService = "gitlab";
    process.env.projectType = "openmrsmodule";
    var expectedMetadata = {
      projectType: process.env.type,
      repoUrl: "https://github.com/openmrs/openmrs-module-attachments",
      repoName: "openmrs-module-attachments",
      branchName: "master",
      commitId: "c71670e"
    };

    var stubs = {};
    stubs["./impl/" + process.env.scmService] = {
      parsePayload: function(payload) {
        return expectedMetadata;
      },
      "@noCallThru": true
    };

    // replay
    proxyquire(path.resolve("src/webhook/webhook"), tests.stubs(stubs, {}));

    // verif
    const utils = require(path.resolve("src/utils/utils"));
    expect(
      fs.readFileSync(tests.config().getCommitMetadataFilePath(), "utf8")
    ).toEqual(JSON.stringify(expectedMetadata));
    expect(
      fs.readFileSync(
        tests.config().getTempDirPath() + "/commit_metadata.env",
        "utf8"
      )
    ).toEqual(utils.convertToEnvVar(expectedMetadata));

    // after
    tests.cleanup();
  });

  it("should save the downstream jobs as a key-value properties file", function() {
    // deps
    const proxyquire = require("proxyquire");

    // replay
    proxyquire(path.resolve("src/webhook/trigger"), tests.stubs());

    // verif
    expect(
      fs.readFileSync(process.env.WORKSPACE + "/trigger.env", "utf8")
    ).toEqual("downstream_job=pipeline1\n");

    // after
    tests.cleanup();
  });
});
