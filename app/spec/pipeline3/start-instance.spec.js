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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

    expect(script).toContain(scripts.remote(ssh, docker.restart(instanceUuid)));
  });

  fit("should generate bash script upon deployment changes.", function() {
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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

    var expectedScript = [];
    expectedScript.push(scripts.remote(ssh, docker.remove(instanceUuid)));
    expectedScript.push(
      scripts.remote(ssh, docker.run(instanceUuid, instanceDef))
    );
    var tls = instanceDef.deployment.tls;
    var keyDestPath = "/etc/ssl/";

    expectedScript.push(
      scripts.remote(
        ssh,
        docker.copy(
          instanceDef.uuid,
          tls.value.privateKeyPath,
          keyDestPath + "privkey.pem",
          true
        )
      )
    );
    expectedScript.push(
      scripts.remote(
        ssh,
        docker.copy(
          instanceDef.uuid,
          tls.value.publicCertPath,
          keyDestPath + "cert.pem"
        )
      )
    );
    expectedScript.push(
      scripts.remote(
        ssh,
        docker.copy(
          instanceDef.uuid,
          tls.value.chainCertsPath,
          keyDestPath + "chain.pem"
        )
      )
    );
    console.log(script)

    expectedScript = expectedScript.join(cst.SCRIPT_SEPARATOR);
    expect(script).toContain(expectedScript);
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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

    var changePerms = "chmod 775 /etc/bahmni-installer/move-mysql-datadir.sh\n";
    var moveMysqlFolder =
      "sh -c '/etc/bahmni-installer/move-mysql-datadir.sh /etc/my.cnf /mnt/data/mysql_datadir'\n";
    var chown = "chown -R mysql:mysql /mnt/data/mysql_datadir";

    var expectedScript = [];
    expectedScript.push(
      scripts.remote(
        ssh,
        docker.exec(instanceUuid, changePerms + moveMysqlFolder + chown)
      )
    );

    expect(script).toContain(expectedScript.join(cst.SCRIPT_SEPARATOR));

    var sqlCmd =
      "cat /tmp/n32bg/demo-data.sql | mysql -uroot -ppassword openmrs";
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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

    var sqlCmd =
      "zcat /tmp/" +
      testRandomString.slice(-5) +
      "/demo-data.sql.gz | mysql -uroot -ppassword openmrs";
    expect(script).toContain(
      scripts.remote(ssh, docker.exec(instanceUuid, sqlCmd))
    );
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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

    var expectedComponentsToLink = [];
    expectedComponentsToLink.push("artifacts", "data");

    var expectedScript = scripts.remote(
      ssh,
      docker.exec(
        instanceDef.uuid,
        scripts_.linkComponents(
          _.uniq(expectedComponentsToLink),
          instanceDef.deployment.links
        )
      )
    );

    expect(script).toContain(expectedScript);

    process.env[config.varDataChanges()] = "true";
    process.env[config.varDeploymentChanges()] = "false";
    process.env[config.varArtifactsChanges()] = "false";
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

    expectedComponentsToLink = [];
    expectedComponentsToLink.push("data");

    var expectedScript = scripts.remote(
      ssh,
      docker.exec(
        instanceDef.uuid,
        scripts_.linkComponents(
          _.uniq(expectedComponentsToLink),
          instanceDef.deployment.links
        )
      )
    );
    expect(script).toContain(expectedScript);

    process.env[config.varDataChanges()] = "false";
    process.env[config.varDeploymentChanges()] = "false";
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

    expectedComponentsToLink = [];
    expectedComponentsToLink.push("artifacts");

    var expectedScript = scripts.remote(
      ssh,
      docker.exec(
        instanceDef.uuid,
        scripts_.linkComponents(
          _.uniq(expectedComponentsToLink),
          instanceDef.deployment.links
        )
      )
    );
    expect(script).toContain(expectedScript);
  });

  it("should handle Bahmni Event Log Service properties file.", function() {
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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

    var expectedScript = [];
    expectedScript.push(
      scripts.remote(
        ssh,
        docker.exec(
          instanceUuid,
          "if [ -d /opt/bahmni-event-log-service/ ]; then\n" +
            "rsync -avz /mnt/data/bahmni-event-log-service/application.properties /opt/bahmni-event-log-service/bahmni-event-log-service/WEB-INF/classes/application.properties\n" +
            "chown -R bahmni:bahmni /opt/bahmni-event-log-service/bahmni-event-log-service/WEB-INF/classes/application.properties\n" +
            "fi"
        )
      )
    );
    expect(script).toContain(expectedScript.join(cst.SCRIPT_SEPARATOR));
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
    var docker = scripts.getDeploymentScripts(instanceDef.deployment.type);

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
