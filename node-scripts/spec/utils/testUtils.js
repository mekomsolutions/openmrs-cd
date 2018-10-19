"use strict";

const __rootPath__ = require("app-root-path").path;

const path = require("path");
const proxyquire = require("proxyquire");
const fsx = require("fs-extra");
const mkdirp = require("mkdirp");
const log = require("npmlog");
const _ = require("lodash");

const cst = require(path.resolve("src/const"));

var testDirPath = "";
var lastDirPath = "";

var mockConfig = {};

var copiedPaths = {};

/*
 * Moves a resource file to a temporary test dir that allows safe editions.
 *
 * @param {string} whereDir - The subdir where to the file should live during tests. Eg. "app_data".
 * @param {array} filePath - The original (= outside of tests) file path.
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
    log.info("Test dir:", testDirPath);
    lastDirPath = testDirPath;
  }
};

var setMockConfig = function(extraConfig) {
  var realConfig = require(path.resolve("src/utils/config"));
  mockConfig = Object.assign({}, realConfig);

  mockConfig.getTempDirPath = function() {
    return testDirPath;
  };
  mockConfig.getBuildArtifactJsonPath = function() {
    return prepareFile(
      realConfig.getRelativeBuildDirPath(),
      path.resolve("spec/utils/resources", "test_artifact_1.json")
    );
  };
  mockConfig.getInstancesConfigPath = function() {
    return prepareFile(
      "app_data",
      path.resolve("spec/utils/resources", "test_instances_1.json")
    );
  };
  mockConfig.getInstancesEventsDbPath = function() {
    return prepareFile(
      "app_data",
      path.resolve("spec/utils/resources", "test_instances_events_1.json")
    );
  };
  mockConfig.getArtifactDependenciesConfigPath = function() {
    return prepareFile(
      "app_data",
      path.resolve("spec/utils/resources", "test_artifacts_dependencies_1.json")
    );
  };
  mockConfig.getArtifactsBuildParamsDbPath = function() {
    return prepareFile(
      "app_data",
      path.resolve("spec/utils/resources", "test_artifacts_build_params_1.json")
    );
  };
  mockConfig.getArtifactIdListFilePath = function() {
    return prepareFile(
      realConfig.getRelativeBuildDirPath(),
      path.resolve("spec/pipeline1/resources", "test_empty_artifacts_ids.txt")
    );
  };

  Object.assign(mockConfig, extraConfig);
};

var setEnvvars = function() {
  process.env.JENKINS_HOME = testDirPath;
  process.env.JOB_NAME = "test-job";
  process.env.BUILD_NUMBER = "3";

  process.env.WORKSPACE = path.resolve(
    testDirPath,
    process.env.JOB_NAME,
    "workspace"
  );

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
   * Typical use: 'proxyquire("file-to-load", tests.stubs())'
   *
   * @param {Object} extraStubs - To add to or override default stubs for proxyquire.
   * @param {Object} extraConfig - To add to or override default mock for the config object.
   * @param {Object} nestedRequires - A map additional {relative path ➔ path to require with stubs}.
   *    Eg:
   *      {
   *        "../commons": path.resolve("src/pipeline1/commons")
   *      }
   *
   **/
  stubs: function(extraStubs, extraConfig, nestedRequires) {
    setTestDir();

    setEnvvars();

    setMockConfig(extraConfig);
    mkdirp.sync(module.exports.config().getBuildDirPath());
    mkdirp.sync(module.exports.config().getAppDataDirPath());

    var stubs = {};
    stubs[cst.CONFIGPATH] = module.exports.config();

    Object.assign(stubs, extraStubs);

    // Further stubbing for nested requires, see https://stackoverflow.com/a/42673500/321797
    stubs[cst.DBPATH] = proxyquire(path.resolve("src/utils/db"), stubs);
    if (!_.isEmpty(nestedRequires)) {
      Object.keys(nestedRequires).forEach(function(requirePath) {
        stubs[requirePath] = proxyquire(nestedRequires[requirePath], stubs);
      });
    }
    return stubs;
  }
};
