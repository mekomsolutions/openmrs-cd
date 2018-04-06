"use strict";

const __rootPath__ = require("app-root-path").path;

const path = require("path");
const proxyquire = require("proxyquire");
const fsx = require("fs-extra");
const mkdirp = require("mkdirp");
const log = require("npmlog");

const cst = require(path.resolve("src/const"));
const config = require(cst.CONFIGPATH);

var testDirPath = "";
var lastDirPath = "";

var mockConfig = {};

var copiedPaths = {};

/**
 * Wrap the path to a resource file with this function when this file might be edited through the tests.
 */
var prepareFile = function(filePath) {
  var newFilePath = path.resolve(
    testDirPath,
    "resources",
    path.basename(filePath)
  );
  if (!(newFilePath in copiedPaths)) {
    fsx.copySync(filePath, newFilePath);
    copiedPaths[newFilePath] = null;
  }
  return newFilePath;
};

var setMockConfig = function(extraConfig) {
  mockConfig.getTempDirPath = function() {
    return testDirPath;
  };
  mockConfig.getCommitMetadataFilePath = function() {
    return path.resolve("spec/webhook", "test_commit_metadata.json");
  };
  mockConfig.getWebhookTriggersFilePath = function() {
    return path.resolve("spec/webhook", "test_webhook_triggers.json");
  };
  mockConfig.getInstancesConfigPath = function() {
    return prepareFile(
      path.resolve("spec/utils/resources", "test_instances_1.json")
    );
  };

  Object.assign(mockConfig, extraConfig);
};

var init = function() {
  process.env.WORKSPACE = testDirPath;

  process.env.JENKINS_HOME = testDirPath;
  process.env.JOB_NAME = "test-job";
  process.env.BUILD_NUMBER = "3";

  process.env.APP_DATA_DIR_PATH = path.resolve(testDirPath, "app_data");
};

module.exports = {
  cleanup: function() {
    fsx.removeSync(testDirPath);
    testDirPath = "";
  },

  config: function() {
    return mockConfig;
  },

  /**
   * Generate the test context with a number of preloaded variables and stubbed objects.
   * Typical use: 'proxiquire("file-to-load", tests.stubs())'
   *
   * @param {Object} extraStubs - To add to or override default stubs for proxyquire.
   * @param {Object} extraConfig - To add to or override default mock for the config object.
   *
   **/
  stubs: function(extraStubs, extraConfig) {
    if (testDirPath === "") {
      testDirPath = path.resolve(
        require("os").tmpdir(),
        Math.random()
          .toString(36)
          .slice(-5)
      ); // https://stackoverflow.com/a/8084248/321797
    }

    // mkdirp.sync(testDirPath);
    if (lastDirPath !== testDirPath) {
      log.info("TEST", testDirPath);
      lastDirPath = testDirPath;
    }

    init();
    mkdirp.sync(config.getBuildDirPath());
    mkdirp.sync(config.getAppDataDirPath());

    setMockConfig(extraConfig);
    var stubs = {};
    stubs[cst.CONFIGPATH] = module.exports.config();

    Object.assign(stubs, extraStubs);
    stubs[cst.DBPATH] = proxyquire(path.resolve("src/utils/db"), stubs); // to hande second level stubbing, https://stackoverflow.com/a/42673500/321797
    return stubs;
  }
};
