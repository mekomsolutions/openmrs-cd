"use strict";

const __rootPath__ = require("app-root-path").path;

const path = require("path");
const proxyquire = require("proxyquire");
const fsx = require("fs-extra");
const mkdirp = require("mkdirp");
const log = require("npmlog");

const cst = require(path.resolve("src/const"));

var testDirPath = "";
var lastDirPath = "";

var mockConfig = {};

var copiedPaths = {};

/*
 * Moves a resource file to a temporary test dir that allows safe editions.
 *
 * @param {string} whereDir - The subdir where to the file should live during tests. Eg. "app_data".
 * @param {array} filePath - The original (=out of tests) file path.
 *
 * @return The saved dependencies.
 */
var prepareFile = function(whereDir, filePath) {
  setTestDir();

  var newFilePath = path.resolve(
    testDirPath,
    whereDir,
    path.basename(filePath)
  );

  if (!(newFilePath in copiedPaths)) {
    fsx.copySync(filePath, newFilePath);
    copiedPaths[newFilePath] = null;
  }
  return newFilePath;
};

var setTestDir = function() {
  if (testDirPath === "") {
    testDirPath = path.resolve(
      require("os").tmpdir(),
      Math.random()
        .toString(36)
        .slice(-5)
    ); // https://stackoverflow.com/a/8084248/321797
  }

  if (lastDirPath !== testDirPath) {
    log.info("TEST", testDirPath);
    lastDirPath = testDirPath;
  }
};

var setMockConfig = function(extraConfig) {
  mockConfig = Object.assign({}, require(path.resolve("src/utils/config")));

  mockConfig.getTempDirPath = function() {
    return testDirPath;
  };
  mockConfig.getCommitMetadataFilePath = function() {
    return prepareFile(
      "tmp",
      path.resolve("spec/webhook", "test_commit_metadata.json")
    );
  };
  mockConfig.getWebhookTriggersFilePath = function() {
    return prepareFile(
      "tmp",
      path.resolve("spec/webhook", "test_webhook_triggers.json")
    );
  };
  mockConfig.getInstancesConfigPath = function() {
    return prepareFile(
      "app_data",
      path.resolve("spec/utils/resources", "test_instances_1.json")
    );
  };
  mockConfig.getArtifactDependenciesConfigPath = function() {
    return prepareFile(
      "app_data",
      path.resolve("spec/utils/resources", "test_artifacts_dependencies_1.json")
    );
  };

  Object.assign(mockConfig, extraConfig);
};

var setEnvvars = function() {
  process.env.WORKSPACE = testDirPath;

  process.env.JENKINS_HOME = testDirPath;
  process.env.JOB_NAME = "test-job";
  process.env.BUILD_NUMBER = "3";

  process.env.APP_DATA_DIR_PATH = path.resolve(testDirPath, "app_data");
};

module.exports = {
  cleanup: function() {
    if (testDirPath) {
      fsx.removeSync(testDirPath);
    }
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
    setTestDir();

    setEnvvars();

    setMockConfig(extraConfig);
    mkdirp.sync(module.exports.config().getBuildDirPath());
    mkdirp.sync(module.exports.config().getAppDataDirPath());

    var stubs = {};
    stubs[cst.CONFIGPATH] = module.exports.config();

    Object.assign(stubs, extraStubs);
    stubs[cst.DBPATH] = proxyquire(path.resolve("src/utils/db"), stubs); // to hande second level stubbing, https://stackoverflow.com/a/42673500/321797
    return stubs;
  }
};
