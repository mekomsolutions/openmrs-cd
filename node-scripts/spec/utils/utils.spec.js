"use strict";

describe("Utils", function() {
  const folderInTest = __dirname + "/../../src/utils/";
  const fs = require("fs");
  const _ = require("lodash");

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

  it("should support '.yml' and '.yaml' extensions and throw error if file is missing", function() {
    var file_ = __dirname + "/../pipeline1/resources/default/extension.yml";
    var ocd3Yaml = utils.convertYaml(file_);
    expect(ocd3Yaml).toBeDefined();

    var file_ = __dirname + "/../pipeline1/resources/default/no-file.yml";
    expect(function() {
      utils.convertYaml(file_);
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
      },
      final: undefined
    };

    var expectedResult =
      "level1_level2_level3_more=stuff\nlevel1_level2_level3_other=stuff\nlevel1_level2_level3_level4_the=end\nlevel1_level2still_last=one\nlevel1_am=bored\nmore=stuff\nipsum_lorem=latin\nfinal=\n";
    var envvar = utils.convertToProperties(realDeepObject);
    expect(envvar).toEqual(expectedResult);

    var expectedResult =
      "level1.level2.level3.more=stuff\nlevel1.level2.level3.other=stuff\nlevel1.level2.level3.level4.the=end\nlevel1.level2still.last=one\nlevel1.am=bored\nmore=stuff\nipsum.lorem=latin\nfinal=\n";
    var envvar = utils.convertToProperties(realDeepObject, ".");
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
    var obj = {
      status: "foobar"
    };

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

  it("should find object based on keyMap.", function() {
    var expectedError1 = new Error(
      "Illegal state: search keys were only partially matched when searching collection"
    );
    var expectedError2 = new Error(
      "Illegal state: search keys were matched multiple times when searching collection"
    );

    var objects = [
      {
        uuid: "uuid-A",
        name: "staging-cambodia"
      },
      {
        uuid: "uuid-B",
        name: "staging-cambodia"
      },
      {
        uuid: "uuid-B",
        name: "dev-cambodia"
      },
      {
        uuid: "uuid-D",
        name: "prod-cambodia"
      }
    ];

    var keyPairs = {
      uuid: "uuid-A"
    };
    expect(utils.findObject(keyPairs, objects).uuid).toEqual("uuid-A");

    var keyPairs = {
      uuid: "uuid-D",
      name: "prod-cambodia"
    };
    expect(utils.findObject(keyPairs, objects).uuid).toEqual("uuid-D");

    keyPairs = {
      uuid: "uuid-B",
      name: "staging-cambodia"
    };
    expect(function() {
      utils.findObject(keyPairs, objects);
    }).toThrow(expectedError1);

    keyPairs = {
      uuid: ""
    };
    expect(_.isEmpty(utils.findObject(keyPairs, objects))).toEqual(true);

    var keyPairs = {
      uuid: "uuid-D",
      name: "dev-cambodia"
    };
    expect(function() {
      utils.findObject(keyPairs, objects);
    }).toThrow(expectedError1);

    keyPairs = {
      name: "staging-cambodia"
    };
    expect(function() {
      utils.findObject(keyPairs, objects);
    }).toThrow(expectedError2);
  });
});
