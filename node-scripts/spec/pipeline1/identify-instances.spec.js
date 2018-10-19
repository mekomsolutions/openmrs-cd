"use strict";

describe("Instances identification", function() {
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  var tests, utils;

  beforeEach(function() {
    tests = require(path.resolve("spec/utils/testUtils"));
    utils = require(path.resolve("src/utils/utils"));
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should spot instances affected by a 'distribution' artifacts change.", function() {
    //
    // setup
    //
    var extraConfig = {};
    extraConfig.getBuildPomPath = function() {
      return path.resolve(
        "spec/" +
          config.getJobNameForPipeline1() +
          "/resources/distribution/pom.xml"
      );
    };

    var config = require(path.resolve("src/utils/config"));

    const stubs = tests.stubs(null, extraConfig, {
      "./impl/distribution": path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/impl/distribution"
      )
    });
    config = tests.config();
    const db = proxyquire(cst.DBPATH, stubs);

    // fitting the Maven project information to the current project type
    var pom = utils.getPom(config.getBuildPomPath());
    var artifact = {
      mavenProject: {
        groupId: pom.groupId,
        artifactId: pom.artifactId,
        version: pom.version
      }
    };
    fs.writeFileSync(
      config.getBuildArtifactJsonPath(),
      JSON.stringify(artifact, null, 2)
    );
    var arty2 = {
      groupId: "net.mekomsolutions",
      artifactId: "foo-bar-arty",
      version: "2.0.0-SNAPSHOT"
    };
    fs.writeFileSync(config.getArtifactIdListFilePath(), [
      utils.toArtifactKey(arty2.groupId, arty2.artifactId, arty2.version)
    ]);

    var beforeInstanceEvents = JSON.parse(
      fs.readFileSync(config.getInstancesEventsDbPath(), "utf-8")
    );

    //
    // replay
    //
    proxyquire(
      path.resolve(
        "src/" + config.getJobNameForPipeline1() + "/identify-instances.js"
      ),
      stubs
    );

    //
    // verif
    //
    expect(
      utils.findObject(
        { uuid: "cacb5448-46b0-4808-980d-5521775671c0" },
        beforeInstanceEvents
      )
    ).toEqual({});

    var afterInstanceEvents = JSON.parse(
      fs.readFileSync(config.getInstancesEventsDbPath(), "utf-8")
    );
    var instanceEvent = utils.findObject(
      { uuid: "cacb5448-46b0-4808-980d-5521775671c0" },
      afterInstanceEvents
    );
    expect(instanceEvent.artifacts.length).toEqual(2);

    expect(
      _.pick(instanceEvent.artifacts[0].value, [
        "groupId",
        "artifactId",
        "version"
      ])
    ).toEqual(artifact.mavenProject);
    expect(
      _.pick(instanceEvent.artifacts[1].value, [
        "groupId",
        "artifactId",
        "version"
      ])
    ).toEqual(arty2);
  });
});
