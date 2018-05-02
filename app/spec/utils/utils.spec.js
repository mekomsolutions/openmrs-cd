"use strict";

describe("Utils", function() {
  const folderInTest = __dirname + "/../../src/utils/";
  const fs = require("fs");
  const utils = require(folderInTest + "utils");
  const model = require(folderInTest + "model");

  it("should extract POM-like information out of an artifact key.", function() {
    // replay
    var pom = utils.fromArtifactKey(
      "org.openmrs.module|appframework-omod|2.10.0"
    );

    // verif
    expect(pom.groupId).toEqual("org.openmrs.module");
    expect(pom.artifactId).toEqual("appframework-omod");
    expect(pom.version).toEqual("2.10.0");

    // verif malformed cases
    expect(function() {
      utils.fromArtifactKey(null);
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey(undefined);
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey({});
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey([]);
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey(" ");
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey("foo");
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey("foo|bar");
    }).toThrow();
    expect(function() {
      utils.fromArtifactKey("foo|bar|baz|zzz");
    }).toThrow();
  });

  it("should flatten environment variables.", function() {
    var realDeepObject = {
      level1: {
        level2: {
          level3: {
            more: "stuff",
            other: "stuff",
            level4: {
              the: "end"
            }
          }
        },
        level2still: {
          last: "one"
        },
        am: "bored"
      },
      more: "stuff",
      ipsum: {
        lorem: "latin"
      }
    };

    var expectedResult =
      "level1_level2_level3_more=stuff\nlevel1_level2_level3_other=stuff\nlevel1_level2_level3_level4_the=end\nlevel1_level2still_last=one\nlevel1_am=bored\nmore=stuff\nipsum_lorem=latin\n";
    var envvar = utils.convertToEnvVar(realDeepObject);
    expect(envvar).toEqual(expectedResult);
  });

  it("should set status and basic audit info to objects.", function() {
    const MockDate = require("mockdate");

    MockDate.set("2015-03-30T13:09:53.867Z");

    // setup
    var obj = {};

    // replay
    utils.setObjectStatus(obj, "created");

    // verif
    expect(obj.status).toEqual("created");
    expect(obj.created).toEqual(obj.updated);
    expect(obj.updated instanceof Date).toBe(true);

    MockDate.set("2015-03-30T13:09:53.868Z");

    // replay
    utils.setObjectStatus(obj, "updated");

    // verif
    expect(obj.status).toEqual("updated");
    expect(obj.updated).toBeGreaterThan(obj.created);

    MockDate.reset();

    // setup
    var obj = { status: "foobar" };

    // replay
    utils.setObjectStatus(obj);

    // verif
    expect(obj.status).toEqual("foobar");
    expect(obj.created).toEqual(obj.updated);
    expect(obj.updated instanceof Date).toBe(true);

    // setup
    var obj = null;

    // replay
    utils.setObjectStatus(obj, "created");

    // verif: null remains null
    expect(obj).toEqual(null);

    // setup
    var obj = undefined;

    // replay
    utils.setObjectStatus(obj, "created");

    // verif: undefined remains undefined
    expect(obj).toEqual(undefined);
  });
});
