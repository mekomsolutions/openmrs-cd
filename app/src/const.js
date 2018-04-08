"use strict";

const path = require("path");
const __root = path.resolve(require("app-root-path").path);

module.exports = {
  /**
   * Use the below constants to require 'config' or 'db', eg:
   *
   *    const cst = require(path.resolve("src/const"));
   *    const config = require(cst.CONFIGPATH);
   *
   * This enables context sensitive tests to run properly.
   */
  CONFIGPATH: path.resolve(__root, "src/utils/config"),
  DBPATH: path.resolve(__root, "src/utils/db"),

  ABSTRACT: "__abstract__"
};
