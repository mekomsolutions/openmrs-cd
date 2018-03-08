"use strict";

describe("start-instance", function() {
  // deps
  const path = require("path");
  const config = require(__dirname + "/../../src/utils/config");
  const fs = require("fs");

  // setup
  const fileInTest = path.resolve(
    __dirname,
    "..",
    "..",
    "src/prestart-instance/validate-instance.js"
  );

  it("should ...", function() {
    // setup
    process.env.instanceDefinition = fs.readFileSync(
      path.resolve(__dirname, "resources/test_instance_definition_1.json"),
      "utf8"
    );
    process.env.WORKSPACE = config.getTempDirPath();

    // replay
    require(fileInTest);
  });
});
