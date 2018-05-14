"use strict";

const _ = require("lodash");
const uuid = require("uuid/v4");

var heredoc = "heredoc_delimiter_7e228d99";

module.exports = {
  /*
   * Trails slashes or not:
   * 
   * foo + true ➔  foo/
   * foo + false ➔  foo
   * foo/ + false ➔  foo
   * foo/ + true ➔  foo/
   */
  trailSlash: function(dirPath, slash) {
    if (_.isNull(slash) || _.isUndefined(slash)) {
      return dirPath;
    }
    if (typeof slash != typeof true) {
      throw Error("Illegal argument: boolean expected: " + slash);
    }

    var endsWithSlash = dirPath.endsWith("/");
    if (endsWithSlash && !slash) {
      return dirPath.slice(0, -1);
    }
    if (!endsWithSlash && slash) {
      return dirPath + "/";
    }
    return dirPath;
  },

  /*
   * Turns a path into a remote path based on the SSH information.
   *    Eg. /tmp ➔  cdadgent@10.99.0.4:/tmp
   * 
   * @param {Object} ssh - The SSH parameters, eg:
   *    {
   *      user: "cdagent",
   *      ip: "10.99.0.4"
   *    }
   *
   * @param {String} ppath - The path to 'remotify'.
   * 
   * @return {String} The remote path
   */
  remotePath: function(ssh, ppath) {
    if (!_.isEmpty(ssh)) {
      ppath = ssh.user + "@" + ssh.ip + ":" + ppath;
    }
    return ppath;
  },

  /*
   * 'rsync' source to destination
   * 
   * @param {Object} ssh - The SSH parameters, eg:
   *    {
   *      user: "cdagent",
   *      ip: "10.99.0.4",
   *      port: "22",
   *      remoteSrc: "false",
   *      remoteDst: "true"
   *    }
   *    Note: 'remoteSrc' and 'remoteDst' are set to true or false to indicate whether they are local or remote dirs
   *
   * @param {String} srcPath - The source path
   * @param {String} dstPath - The destination path
   * @param {Boolean} slashSrc - Set to true to add a trailing slash to the source path
   * @param {Boolean} slashDst - Set to true to add a trailing slash to the destination path
   * @param {String} args - To override the default args: '-avz'
   *
   * @return {String} The remote version of the script
   */
  rsync: function(ssh, srcPath, dstPath, slashSrc, slashDst, args) {
    srcPath = module.exports.trailSlash(srcPath, slashSrc);
    dstPath = module.exports.trailSlash(dstPath, slashDst);

    if (!args) {
      args = "-avz";
    }

    var sshPort = "";
    if (!_.isEmpty(ssh)) {
      if (ssh.remoteSrc && ssh.remoteSrc === true) {
        srcPath = module.exports.remotePath(ssh, srcPath);
        sshPort = " -e 'ssh -p " + ssh.port + "'";
      }
      if (ssh.remoteDst && ssh.remoteDst === true) {
        dstPath = module.exports.remotePath(ssh, dstPath);
        sshPort = " -e 'ssh -p " + ssh.port + "'";
      }
    }

    var script = "";

    script += "rsync " + args + sshPort + " " + srcPath + " " + dstPath;
    script += "\n";

    return script;
  },

  /*
   * Turns a script into an SSH remote script based on the SSH parameters and using bash's heredoc.
   * 
   * @param {Object} ssh - The SSH parameters, eg:
   *    {
   *      user: "cdagent",
   *      ip: "10.99.0.4",
   *      port: "22"
   *    }
   *
   * @param {String} script - The script to become a remote script.
   *
   * @return {String} The remote version of the script
   */
  remote: function(ssh, script) {
    if (!script.endsWith("\n")) {
      script += "\n";
    }
    var remoteScript = "";

    remoteScript +=
      "ssh -T " +
      ssh.user +
      "@" +
      ssh.ip +
      " -p " +
      ssh.port +
      " <<" +
      heredoc +
      "\n";
    remoteScript += script;
    remoteScript += heredoc;

    script = remoteScript + "\n";

    return script;
  },

  initFolder: function(folderPath, user) {
    var group = user;
    var script = "";

    script += "sudo mkdir -p " + folderPath;
    script += "\n";
    script += "sudo chown -R " + user + ":" + group + " " + folderPath + "\n";
    script += "rm -rf " + folderPath + "/*";
    script += "\n";

    return script;
  },

  /*
   * Generates a script that fetches an instance's artifacts to save them a specified location.
   * 
   * @param {Object} artifact - An 'artifact' section of the artifacts part of the instance definition.
   * @param {String} destPath - The destination part where to save the fecthed artifact.
   *
   * @return {String} The script as a string.
   */
  fetchArtifact: function(artifact, destPath) {
    var script = "";

    if (artifact.type === "maven") {
      script +=
        "mvn dependency:unpack" +
        " " +
        "-Dartifact=" +
        artifact.value.groupId +
        ":" +
        artifact.value.artifactId +
        ":" +
        artifact.value.version +
        ":" +
        artifact.value.packaging +
        " " +
        "-DoutputDirectory=" +
        destPath;
      script += "\n";
    }

    return script;
  }
};
