describe("Tests suite for Pipeline2 ", function() {
  const folderInTest = __dirname + "/../../src/pipeline2/";
  const fs = require("fs");

  it("should verify job parameters.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const fs = require("fs");
    const config = require(__dirname + "/../../src/utils/config");

    // replay
    var jenkinsFile = fs.readFileSync(
      __rootPath__ +
        "/../jenkins/jenkins_home/jobs/" +
        config.getJobNameForPipeline2() +
        "/config.xml",
      "utf8"
    );

    // verif
    expect(jenkinsFile).toContain(
      "<upstreamProjects>" +
        config.getJobNameForPipeline1() +
        "</upstreamProjects>"
    );
    expect(jenkinsFile).toContain(
      "<scriptPath>jobs/pipelines/" +
        config.getJobNameForPipeline2() +
        ".jenkinsfile</scriptPath>"
    );
  });

  it("should verify pipeline steps scripts.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const fs = require("fs");
    const config = require(__dirname + "/../../src/utils/config");

    // replay
    var jenkinsFile = fs.readFileSync(
      __rootPath__ +
        "/../jobs/pipelines/" +
        config.getJobNameForPipeline2() +
        ".jenkinsfile",
      "utf8"
    );

    // verif stage 'setup'
    expect(jenkinsFile).toContain("sh 'cd /opt/app/; npm install'");

    // verif stage 'fetch servers descriptors'
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getFetchServersDescriptorsJsScriptName() +
        " $JENKINS_HOME/" +
        config.getServersConfigPath() +
        "'"
    );

    // verif stage 'parse servers descriptors'
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getParseServersDescriptorsJsScriptName() +
        "'"
    );

    // verif stage 'update servers change log'
    expect(jenkinsFile).toContain(
      "sh 'node /opt/app/src/$JOB_NAME/" +
        config.getUpdateServerChangelogJsScriptName() +
        "'"
    );
    expect(jenkinsFile).toContain(
      "sh 'cat $JENKINS_HOME/" + config.getServersChangelogPath() + "'"
    );
  });

  it("should implement all required functions from model", function() {
    const model = require(__dirname + "/../../src/models/model");
    const modelTestUtils = require(__dirname + "/../models/modelTestUtils");

    fs.readdirSync(folderInTest + "impl/").forEach(file => {
      var type = file.split(".")[0];
      var descriptor = new require(folderInTest + "impl/" + type).getInstance(
        null,
        null
      );

      modelTestUtils.ensureImplementedFunctions(descriptor, model.Descriptor);
    });
  });

  it("should fetch each server descriptor (ex, pom.xml) based on the URLs provided in the servers.json file", function(done) {
    const nock = require("nock");

    // Mock the HTTPS calls using 'nock' module
    nock("https://repo.mekomsolutions.net")
      .get("/cambodia/master/pom.xml")
      .reply(200, {
        type: "pom"
      });

    nock("https://repo.mekomsolutions.net")
      .get("/cambodia/unexistingref/pom.xml")
      .reply(404, {});

    nock("https://repo.mekomsolutions.net")
      .get("/haiti/master/pom.xml")
      .reply(200, {
        type: "pom"
      });

    const descriptorService = require(folderInTest + "descriptorService");
    var servers = JSON.parse(
      fs.readFileSync(__dirname + "/resources/servers.json", "utf8")
    );
    descriptorService.fetchRemoteDistroDescriptors(servers, function(
      errors,
      result
    ) {
      expect(result[0].descriptor).not.toEqual("");
      expect(result[0].type).toEqual("pom");

      expect(result[1].descriptor).not.toEqual("");
      expect(result[1].type).toEqual("pom");

      expect(errors[0].error).toEqual(404);
      done();
    });
  });

  it("should parse a pom file", function() {
    var descriptors = JSON.parse(
      fs.readFileSync(__dirname + "/resources/descriptors.json", "utf8")
    );

    var allDeps = [];
    descriptors.forEach(function(item) {
      var descriptor = require(folderInTest + "/impl/" + item.type).getInstance(
        item.serverId,
        item.descriptor
      );
      var serverDeps = descriptor.getDependencies();
      allDeps[item.serverId] = serverDeps;
    });

    var id1Server = allDeps.id1;
    expect(id1Server[0].version).toEqual("1.0-SNAPSHOT");
    expect(id1Server[0].groupId).toEqual("net.mekomsolutions");
    expect(id1Server[0].artifactId).toEqual("openmrs-config-cambodia");
    expect(id1Server[4].version).toEqual("0.89-SNAPSHOT");
    expect(id1Server[5].version).toEqual("0.89-SNAPSHOT");

    var id2Server = allDeps.id2;
    expect(id2Server[0].version).toEqual("1.0-SNAPSHOT");
    expect(id2Server[0].groupId).toEqual("org.globalhealthcoalition");
    expect(id2Server[0].artifactId).toEqual("openmrs-config-haiti");
    expect(id2Server[4].version).toEqual("0.89-SNAPSHOT");
    expect(id2Server[5].version).toEqual("0.89-SNAPSHOT");
  });
});
