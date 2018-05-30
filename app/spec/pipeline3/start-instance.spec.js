"use strict";

describe("Start instance scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const proxyquire = require("proxyquire");
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

    instanceUuid = "cacb5448-46b0-4808-980d-5521775671c0";
    testRandomString = "0.7p3z2u8fbvi76n32bg"
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

    expect(script).toContain(
      scripts.remote(ssh, scripts.container.restart(instanceUuid))
    );
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
    var docker = scripts.container;

    expect(script).toContain(
      scripts.remote(ssh, docker.remove(instanceUuid)) +
        scripts.remote(ssh, docker.run(instanceUuid, instanceDef))
    );
  });

  it("should generate bash script upon data changes.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
        return testRandomString;
    }  

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs({"../utils/utils": mockUtils})
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
    var docker = scripts.container;

    var changePerms = "chmod 775 /etc/bahmni-installer/move-mysql-datadir.sh\n";
    var moveMysqlFolder =
      "sh -c '/etc/bahmni-installer/move-mysql-datadir.sh /etc/my.cnf /mnt/data/mysql_datadir'\n";
    var chown = "chown -R mysql:mysql /mnt/data/mysql_datadir";
    expect(script).toContain(
      scripts.remote(
        ssh,
        docker.exec(instanceUuid, changePerms + moveMysqlFolder + chown)
      )
    );

    var sqlCmd =
      "cat /tmp/n32bg/demo-data.sql | mysql -uroot -ppassword openmrs";
    expect(script).toContain(
      scripts.remote(ssh, docker.exec(instanceUuid, sqlCmd))
    );

    instanceDef.data[1].value.sourceFile =
      instanceDef.data[1].value.sourceFile + ".gz";
    db.saveInstanceDefinition(instanceDef, instanceUuid);

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs({"../utils/utils": mockUtils})
    );

    // verif
    script = fs.readFileSync(
      path.resolve(
        config.getBuildDirPath(),
        config.getStartInstanceScriptName()
      ),
      "utf8"
    );

    sqlCmd =
      "zcat /tmp/" + testRandomString.slice(-5) + "/demo-data.sql.gz | mysql -uroot -ppassword openmrs";
    expect(script).toContain(
      scripts.remote(ssh, docker.exec(instanceUuid, sqlCmd))
    );
  });

  it("should handle '.gz' data source files.", function() {
    process.env[config.varInstanceUuid()] = instanceUuid;
    process.env[config.varDataChanges()] = "true";
    var instanceDef = db.getInstanceDefinition(instanceUuid);

    instanceDef.data[1].value.sourceFile =
      instanceDef.data[1].value.sourceFile + ".gz";
    db.saveInstanceDefinition(instanceDef, instanceUuid);

    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
        return testRandomString;
    }  

    // replay
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline3() + "/start-instance.js"
      ),
      tests.stubs({"../utils/utils": mockUtils})
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
    var docker = scripts.container;
    var sqlCmd =
      "zcat /tmp/" + testRandomString.slice(-5) + "/demo-data.sql.gz | mysql -uroot -ppassword openmrs";
    expect(script).toContain(
      scripts.remote(ssh, docker.exec(instanceUuid, sqlCmd))
    );
  });

});
