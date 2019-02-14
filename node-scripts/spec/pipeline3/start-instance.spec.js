"use strict";

describe("Start instance scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const proxyquire = require("proxyquire");
  const cst = require(path.resolve("src/const"));
  var tests, stubs, utils, config, scripts, db;
  var instanceUuid, testRandomString;

  beforeEach(function() {
    utils = require(path.resolve("src/utils/utils"));
    tests = require(path.resolve("spec/utils/testUtils"));
    stubs = tests.stubs();

    config = tests.config();
    scripts = require(path.resolve(
      "src/" + config.getJobNameForPipeline3() + "/scripts"
    ));
    db = proxyquire(path.resolve("src/utils/db"), stubs);

    process.env[config.varArtifactsChanges()] = "false";
    process.env[config.varDeploymentChanges()] = "false";
    process.env[config.varDataChanges()] = "false";
    process.env[config.varCreation()] = "false";

    instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
    testRandomString = "0.7p3z2u8fbvi76n32bg";
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should generate bash script upon artifact changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varArtifactsChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );
    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    expect(script).toContain(scripts.remote(ssh, docker.restart(instanceUuid)));
  });

  it("should generate bash script upon deployment changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDeploymentChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    var expectedScript = [];
    expectedScript.push(scripts.remote(ssh, docker.remove(instanceUuid)));

    var tls = instanceDef.deployment.tls;
    var mounts = {
      "/mnt": instanceDef.deployment.hostDir
    };
    mounts[tls.value.keysFolder] = tls.value.hostKeysFolder;

    expectedScript.push(
      scripts.remote(ssh, docker.run(instanceUuid, instanceDef, mounts))
    );
    var setTLS =
      tls.value.webServerUpdateScript +
      " " +
      tls.value.webServerConfFile +
      " " +
      scripts.trailSlash(tls.value.keysFolder, true) +
      tls.value.privateKeyFilename +
      " " +
      scripts.trailSlash(tls.value.keysFolder, true) +
      tls.value.publicCertFilename +
      " " +
      scripts.trailSlash(tls.value.keysFolder, true) +
      tls.value.chainCertsFilename;

    expectedScript = expectedScript.join(cst.SCRIPT_SEPARATOR);
    expect(script).toContain(expectedScript);
    expect(script).toContain(setTLS);
  });

  it("should generate bash script upon data changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
      return testRandomString;
    };

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs({ "../utils/utils": mockUtils })
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    var destFolder = "/tmp/n32bg/";
    var sql = instanceDef.data[2].value;

    // ensure MySQL Restore is called when engine is 'mysql'
    expect(script).toContain(
      scripts.remote(
        ssh,
        docker.exec(
          instanceDef.uuid,
          scripts.mySqlRestore(destFolder, path.basename(sql.sourceFile), sql)
        )
      )
    );
    // ensure Bahmni Restore is called when engine is 'bahmni'
    sql = instanceDef.data[3].value;

    expect(script).toContain(
      scripts.remote(
        ssh,
        docker.exec(
          instanceDef.uuid,
          scripts.bahmniRestore(destFolder, path.basename(sql.sourceFile), sql)
        )
      )
    );
  });

  it("should handle '.gz' data source files.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    instanceDef.data[2].value.sourceFile =
      instanceDef.data[2].value.sourceFile + ".gz";
    db.saveInstanceDefinition(instanceDef, instanceUuid);

    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
      return testRandomString;
    };

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs({ "../utils/utils": mockUtils })
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    var sqlCmd =
      "zcat /tmp/" +
      testRandomString.slice(-5) +
      "/demo-data.sql.gz | mysql -uroot -ppassword openmrs";
    expect(script).toContain(instanceUuid, sqlCmd);
  });

  it("should link mounted folders.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
      return testRandomString;
    };

    var stubs = tests.stubs({ "../utils/utils": mockUtils }, null, {
      "./scripts": path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/scripts"
      )
    });
    var scripts_ = proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline3() + "/scripts.js"),
      stubs
    );

    process.env[config.varDataChanges()] = "true";
    process.env[config.varDeploymentChanges()] = "true";
    process.env[config.varArtifactsChanges()] = "true";
    process.env[config.varCreation()] = "true";

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      stubs
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );

    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    var expectedScript = scripts.remote(
      ssh,
      docker.exec(
        instanceDef.uuid,
        scripts_.linkComponents(instanceDef.deployment.links)
      )
    );

    expect(script).toContain(expectedScript);
  });
  it("should call the setTimezone method", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDeploymentChanges()] = "true";
    process.env[config.varCreation()] = "false";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );
    expect(script).toContain(scripts.setTimezone("Asia/Phnom_Penh"));
  });
  it("should call the computeAdditionalScripts method.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    process.env[config.varCreation()] = "false";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs()
    );

    // verif
    var script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );
    var ssh = instanceDef.deployment.host.value;
    var docker = scripts[instanceDef.deployment.type];

    var expectedScript = [];
    expectedScript.push(
      scripts.remote(ssh, docker.exec(instanceDef.uuid, "/stage/5/script.sh"))
    );
    expectedScript.push(
      scripts.remote(
        ssh,
        docker.exec(
          instanceDef.uuid,
          "/usr/bin/bahmni -i local.inventory concat-configs"
        )
      )
    );
    expect(script).toContain(expectedScript.join(cst.SCRIPT_SEPARATOR));
  });
});
