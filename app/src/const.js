"use strict";

const path = require("path");

module.exports = {
  /**
   * Use the below constants to require 'config' or 'db', eg:
   *
   *    const cst = require(path.resolve("src/const"));
   *    const config = require(cst.CONFIGPATH);
   */
  CONFIGPATH: path.resolve("src/utils/config"),
  DBPATH: path.resolve("src/utils/db"),

  ABSTRACT: "__abstract__"
};
