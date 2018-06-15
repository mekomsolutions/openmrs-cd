"use strict";

const path = require("path");
const _ = require("lodash");
const uuid = require("uuid/v4");

const cst = require("../const");
const heredoc = cst.HEREDOC;
const heredoc_2 = cst.HEREDOC_2;
const utils = require("../utils/utils");

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
  rsync: function(ssh, srcPath, dstPath, slashSrc, slashDst, args, sudo) {
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
    if (sudo) {
      script += "sudo ";
    }
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

  initFolder: function(folderPath, user, wipe) {
    var group = user;
    var script = "";

    script += "sudo mkdir -p " + folderPath;
    script += "\n";
    script += "sudo chown -R " + user + ":" + group + " " + folderPath + "\n";
    script += wipe == true ? "rm -rf " + folderPath + "/*" : "";
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
        "mvn dependency:copy" +
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
        destPath +
        "\n";

      var fileName =
        artifact.value.artifactId +
        "-" +
        artifact.value.version +
        "." +
        artifact.value.packaging;

      script += "unzip " + destPath + "/" + fileName + " -d " + destPath + "/";
      script += "\n";
      script += "rm " + destPath + "/" + fileName;
      script += "\n";
    }

    return script;
  },
  /*
  * Symlinks a source to a target.
  *
  * @param {String} source - The source path to be linked.
   * @param {String} target - The target to which to link the source.
   * @param {Boolean} removeIfExists - Will remove the 'target' if it exists already.
   */
  linkFolder: function(source, target, removeIfExists) {
    var script = "";
    if (removeIfExists) {
      script += "if [ -e " + target + " ]; then\n";
      script += "echo \"'" + target + "' exists. Backing it up...\"\n";
      script += module.exports.rsync(
        {},
        target,
        target +
          "_" +
          utils
            .random()
            .toString(36)
            .slice(-5) +
          ".backup"
      );
      script += "rm -rf " + target + "\n";
      script += "fi\n";
    }

    script += 'echo "MountPoint: ' + source + ", Target: " + target + '"\n';
    script += "ln -s " + source + " " + target + "\n";
    script += "chown -R bahmni:bahmni " + source + "\n";

    return script;
  },
  linkComponents: function(componentsToLink, links) {
    var script = "";
    if (!_.isEmpty(componentsToLink)) {
      script += "# Link mounted folder...\n\n";
    }
    componentsToLink.forEach(function(componentToLink) {
      if (componentToLink === "artifacts") {
        links.forEach(function(item) {
          if (item.type === "artifact") {
            script += "# '" + item.component + "' component:\n";
            script += module.exports.linkFolder(item.source, item.target, true);
            script += "\n";
          }
        });
      }
      if (componentToLink === "data") {
        links.forEach(function(item) {
          if (item.type === "data") {
            script += "# '" + item.component + "' component:\n";
            script += module.exports.linkFolder(item.source, item.target, true);
            script += "\n";
          }
        });
      }
    });
    return script;
  },

  /*
   * Script utils to manipulate Docker containers.
   *
   */
  container: {
    /*
     * Util function that wraps the passed commands so each is applied either if the container exists or if it does not.
     * 
     * @param {String} containerName - The name of the container.
     * @param {String} ifExistsCommand - The command that should run if the container exists.
     * @param {String} elseCommand - The command that will run if the container does *not* exist.
     *
     * @return {String} The script as a string.
     */
    ifExists: function(containerName, ifExistsCommand, elseCommand) {
      var script = "";
      script += "set -xe\n";
      script +=
        "container=\\$(docker ps -a --filter name=" +
        containerName +
        " --format {{.Names}})\n";
      script += 'if [ "\\$container" == "' + containerName + '" ]\n';
      script += "then ";
      script += !_.isEmpty(ifExistsCommand) ? ifExistsCommand : "echo\n";
      script += "else ";
      script += !_.isEmpty(elseCommand) ? elseCommand : "echo\n";
      script += "fi\n";

      return script;
    },

    /*
     * Generates a script that restarts the passed container.
     * 
     * @param {String} containerName - The name of the container to restart.
     *
     * @return {String} The script as a string.
     */
    restart: function(containerName) {
      var script = "";
      script += "set -xe\n";
      script += "docker restart " + containerName + "\n";
      return module.exports.container.ifExists(containerName, script);
    },

    /*
     * Generates a script to remove the passed container.
     * 
     * @param {String} containerName - The name of the container to remove.
     *
     * @return {String} The script as a string.
     */
    remove: function(containerName) {
      var script = "";
      script += "set -xe\n";
      script += "docker stop " + containerName + "\n";
      script += "docker rm -v " + containerName + "\n";
      return module.exports.container.ifExists(containerName, script);
    },

    /*
     * Run a new container with the appropriate options.
     * 
     * @param {String} containerName - The name of the container to run.
     * @param {Object} instanceDef - The instance definition of the instance to start.
     *
     * @return {String} The script as a string.
     */
    run: function(containerName, instanceDef) {
      var hostDir = instanceDef.deployment.hostDir;
      var docker = instanceDef.deployment.value;

      var script = "";
      script += "set -xe\n";

      var scriptArgs = [];
      scriptArgs.push("docker run -dit");
      scriptArgs.push("--restart unless-stopped");

      Object.keys(docker.ports).forEach(function(key) {
        scriptArgs.push("--publish " + docker.ports[key] + ":" + key);
      });

      var labels = {
        type: instanceDef.type,
        group: instanceDef.group
      };
      Object.keys(labels).forEach(function(key) {
        scriptArgs.push("--label " + key + "=" + labels[key]);
      });

      scriptArgs.push("--name " + containerName);
      scriptArgs.push("--hostname bahmni");

      var mounts = {
        "/mnt": hostDir
      };
      Object.keys(mounts).forEach(function(key) {
        scriptArgs.push(
          "--mount type=bind,source=" + mounts[key] + ",target=" + key
        );
      });

      scriptArgs.push(docker.image + ":" + docker.tag);

      scriptArgs.forEach(function(arg, index) {
        script += arg;
        script += !scriptArgs[index + 1] ? "" : " ";
      });
      return script + "\n";
    },

    /*
     * Executes the passed shell command into the container.
     * 
     * @param {String} containerName - The name of the container on which to execute the command.
     * @param {String} command - The command to execute.
     *
     * @return {String} The script as a string.
     */
    exec: function(containerName, command) {
      var script = "";
      script += "set -xe\n";
      script +=
        "docker exec -i " +
        containerName +
        " /bin/bash -s <<" +
        heredoc_2 +
        "\n";
      script += "set -xe\n";
      script += command + "\n";
      script += heredoc_2;

      return script + "\n";
    },

    /*
     * Copy 'source' located on the host to the container's 'destination'.
     * 
     * @param {String} containerName - The name of the container onto which to copy the data.
     * @param {String} source - The source file to be copied on the container.
     * @param {String} destination - The destination location for this file.
    *
     * @return {String} The script as a string.
     */
    copy: function(containerName, source, destination) {
      var script = "";
      script += module.exports.container.exec(
        containerName,
        "mkdir -p " + destination
      );
      script += "docker cp " + source + " " + containerName + ":" + destination;

      return script + "\n";
    }
  }
};
