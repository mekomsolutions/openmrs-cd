"use strict";

describe("filter-events", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const _ = require("lodash");

  const utils = require(path.resolve("src/utils/utils"));
  const proxyquire = require("proxyquire");

  const cst = require(path.resolve("src/const"));

  // setup
  const fileInTest = path.resolve("src/instance-event/filter-events.js");

  var tests, stubs, config, db;

  beforeEach(function() {
    tests = require(path.resolve("spec/utils/testUtils"));
    stubs = tests.stubs();
    config = tests.config();
    db = proxyquire(path.resolve("src/utils/db"), stubs);
  });

  afterEach(function() {
    tests.cleanup();
  });

  it("should verify job parameters and references.", function() {
    // deps
    const __rootPath__ = require("app-root-path").path;
    const config = require(path.resolve("src/utils/config"));
    const ent = require("ent");

    // replay
    var jobConfigFile = fs.readFileSync(
      path.resolve(
        __rootPath__,
        "..",
        "jenkins/jenkins_home/jobs/" +
          config.getJobNameForInstanceEventsCron() +
          "/config.xml"
      ),
      "utf8"
    );
    jobConfigFile = ent.decode(jobConfigFile);

    // verif
    expect(jobConfigFile).toContain(
      "<command>node /opt/app/src/" +
        config.getJobNameForInstanceEvent() +
        "/" +
        config.getFilterEventsJsScriptName()
    );
    expect(jobConfigFile).toContain(
      'def downstreamJob = hudson.model.Hudson.instance.getJob("' +
        config.getJobNameForInstanceEvent() +
        '")'
    );
    expect(jobConfigFile).toContain(
      'def events = new JsonSlurper().parse( new File("${env.' +
        config.varEnvvarBuildPath() +
        "}/" +
        config.getFilteredInstancesEventsFileName() +
        '") )'
    );
    expect(jobConfigFile).toContain(
      'def params = new StringParameterValue("' +
        config.varInstanceEvent() +
        '", JsonOutput.toJson(events[i]))'
    );
  });

  it("should extract non-prod events to a build-available file.", function() {
    // setup
    var beforeEvents = db.getAllInstancesEvents();

    // replay
    proxyquire(fileInTest, stubs);

    // verif
    var filteredEvents = JSON.parse(
      fs.readFileSync(config.getFilteredInstancesEventsJsonPath(), "utf-8")
    );
    var afterEvents = db.getAllInstancesEvents();

    // verif - no 'prod' events got filtered
    expect(
      _.filter(filteredEvents, function(event) {
        return event.type == cst.INSTANCETYPE_PROD;
      }).length
    ).toEqual(0);

    // verif - filtered events were there before and are gone now
    filteredEvents.forEach(function(event) {
      expect(
        utils.findObject({ uuid: event.uuid, name: event.name }, beforeEvents)
      ).toEqual(event);
      expect(
        utils.findObject({ uuid: event.uuid, name: event.name }, afterEvents)
      ).toEqual({});
    });
  });
});
