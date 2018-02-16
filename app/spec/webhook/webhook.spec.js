"use strict";
describe("Test suite for webhook scripts", function() {
  it("should parse a GitHub HTTP payload", function() {
    // deps
    const fs = require("fs");

    // setup
    var folderInTest = __dirname + "/../../src/webhook/";

    var type = "github";
    var payloadParser = new require(folderInTest + "impl/" + type);

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
    const os = require("os");
    const fs = require("fs");

    // setup
    var folderInTest = __dirname + "/../../src/webhook";
    var fileInTest = folderInTest + "/webhook";

    process.env.scmService = "gotlub";
    process.env.projectType = "openmrsmodule";
    var expectedMetadata = {
      projectType: process.env.type,
      repoUrl: "https://github.com/openmrs/openmrs-module-attachments",
      repoName: "openmrs-module-attachments",
      branchName: "master",
      commitId: "c71670e"
    };

    var mockConfig = {};
    mockConfig.getTempDirPath = function() {
      return os.tmpdir();
    };
    mockConfig.getCommitMetadataFilePath = function() {
      return __dirname + "/test_commit_metadata.json";
    };
    var stubs = {
      "../utils/config": mockConfig
    };
    stubs["./impl/" + process.env.scmService] = {
      parsePayload: function(payload) {
        return expectedMetadata;
      },
      "@noCallThru": true
    };

    // replay
    proxyquire(fileInTest, stubs);

    // verif
    const utils = require(folderInTest + "../../utils/utils");
    expect(
      fs.readFileSync(mockConfig.getCommitMetadataFilePath(), "utf8")
    ).toEqual(JSON.stringify(expectedMetadata));
    expect(
      fs.readFileSync(mockConfig.getTempDirPath() + "/commit_metadata.env", "utf8")
    ).toEqual(utils.convertToEnvVar(expectedMetadata));
  });

  it("should save the downstream jobs as a key-value properties file", function() {
    // deps
    const proxyquire = require("proxyquire");
    const os = require("os");
    const fs = require("fs");

    // setup
    var folderInTest = __dirname + "/../../src/webhook";
    var fileInTest = folderInTest + "/trigger";

    var mockConfig = {};
    mockConfig.getCommitMetadataFilePath = function() {
      return __dirname + "/test_commit_metadata.json";
    };
    mockConfig.getWebhookTriggersFilePath = function() {
      return __dirname + "/test_webhook_triggers.json";
    };
    var stubs = {
      "../utils/config": mockConfig
    };

    process.env.WORKSPACE = os.tmpdir();

    // replay
    proxyquire(fileInTest, stubs);

    // verif
    expect(
      fs.readFileSync(process.env.WORKSPACE + "/trigger.env", "utf8")
    ).toEqual("downstream_job=pipeline1\n");
  });
});
