"use strict";

const path = require("path");
const _ = require("lodash");
const uuid = require("uuid/v4");

const cst = require("../const");
const heredoc = cst.HEREDOC;
const heredoc_2 = cst.HEREDOC_2;
const heredoc_3 = cst.HEREDOC_3;
const utils = require("../utils/utils");
const model = require("../utils/model");

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
   * @param {String} sudo - Apply the command as sudo
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
    if (!ssh.shell) {
      ssh.shell = "/bin/bash";
    }

    remoteScript +=
      "ssh -T " +
      ssh.user +
      "@" +
      ssh.ip +
      " -p " +
      ssh.port +
      " " +
      ssh.shell +
      " <<" +
      heredoc +
      "\n";
    remoteScript += script;
    remoteScript += heredoc;

    script = remoteScript + "\n";

    return script;
  },

  initFolder: function(folderPath, user, group, wipe) {
    if (group == null) group = user;
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
   * @param {String} user - The owner of the folder to be set.
   * @param {String} group - The owner's group of the folder to be set.
   */
  linkFolder: function(source, target, user, group) {
    var script = "";

    script +=
      "if [[ ( ! -e " + source + " ) && ( -e " + target + " ) ]]; then\n";
    script += module.exports.logInfo(
      "'" + source + "' does not exist and '" + target + "' exists."
    );
    script += module.exports.logWarn(
      "Will create '" +
        source +
        "' and initialize it with '" +
        target +
        "' data first."
    );
    script += module.exports.logInfo("Creating '" + source + "'.");
    script += "mkdir -p " + source + "\n";

    script += module.exports.logInfo(
      "Initialize '" + source + "' with '" + target + "' data."
    );
    script += module.exports.rsync({}, target, source, true);
    script += "else\n";
    script += module.exports.logInfo(
      "'" + source + "' exists and/or '" + target + "' does not exist."
    );
    script += module.exports.logInfo("-> Skipping initialization.");
    script += "fi\n";

    script +=
      "if [[ ( ! -e " + source + " ) && ( ! -e " + target + " ) ]]; then\n";
    script += module.exports.logInfo(
      "Neither '" + source + "' nor '" + target + "' exist."
    );
    script += module.exports.logInfo("Creating '" + source + "'.");
    script += "mkdir -p " + source + "\n";
    script += "fi\n";

    script += "if [[ ( -e " + source + " ) && ( -e " + target + " ) ]]; then\n";
    script += module.exports.logInfo(
      "Both '" + source + "' and '" + target + "' exist."
    );
    script += module.exports.logInfo(
      "Will link '" + source + "' to folder '" + target + "'."
    );
    script += module.exports.logInfo("Backing up '" + target + "' first.");
    script += module.exports.rsync({}, target, target + ".backup", true);
    script += module.exports.logInfo("Remove '" + target + "'");
    script += "rm -rf " + target + "\n";
    script += "fi\n";

    script += module.exports.logInfo(
      "Symlinking '" + source + "' to target '" + target + "'"
    );
    script += "ln -s " + source + " " + target + "\n";
    script += "chown -R " + user + ":" + group + " " + source + "\n";

    return script;
  },
  linkComponents: function(links) {
    var script = "";

    links.forEach(function(item) {
      script += module.exports.logInfo(
        "Processing links for '" +
          item.component +
          "' component (type: " +
          item.type +
          ")"
      );
      script += module.exports.linkFolder(
        item.source,
        item.target,
        item.user,
        item.group,
        true
      );
      script += module.exports.logInfo(
        "'" + item.component + "' component successfully linked."
      );
      script += module.exports.log("");
    });

    return script;
  },
  color: function(type, text) {
    var text = Object.is(text, undefined) ? "" : text;
    var colorMap = {
      INFO: "34m",
      WARN: "33m",
      ERROR: "31m"
    };
    return (
      "[\\e[1m\\e[" +
      colorMap[type] +
      type +
      "\\e[0m] \\e[34m" +
      text +
      "\\e[0m"
    );
  },
  colorInfo: function(text) {
    return module.exports.color("INFO", text);
  },
  colorWarn: function(text) {
    return module.exports.color("WARN", text);
  },
  colorError: function(text) {
    return module.exports.color("ERROR", text);
  },
  logInfo: function(text) {
    return module.exports.log(text, module.exports.colorInfo());
  },
  logWarn: function(text) {
    return module.exports.log(text, module.exports.colorWarn());
  },
  logError: function(text) {
    return module.exports.log(text, module.exports.colorError());
  },
  log: function(text, linePrefix) {
    var text = Object.is(text, undefined) ? "" : text;
    var linePrefix = Object.is(linePrefix, undefined) ? "" : linePrefix;

    //https://stackoverflow.com/a/33817423
    return (
      "readarray textToPrint << " +
      heredoc_3 +
      "\n" +
      linePrefix +
      text +
      "\n" +
      heredoc_3 +
      "\n" +
      "printf '%b' \"\\\\\\${textToPrint[@]#}\"\n"
    );
  },
  /*
   * Method to return scripts to set the server Timezone.
   *
   */
  setTimezone: function(timezone) {
    var script = "";
    script += module.exports.logInfo("Setting server timezone to " + timezone);
    script += "mv /etc/localtime /etc/localtime.backup\n";
    script += "ln -s /usr/share/zoneinfo/" + timezone + " /etc/localtime\n";
    return script;
  },
  /*
   * Implementation of script utils to specifically manipulate Docker containers.
   *
   */
  docker: {
    /*
     * Util function that wraps the passed commands so each is applied either accordingly.
     * 
     * @param {String} containerName - The name of the container.
     * @param {String} ifExistsCommand - The command that should run if the container exists.
     * @param {String} elseCommand - The command that will run if the container does *not* exist.
     *
     * @return {String} The script as a string.
     */
    ifExists: function(containerName, ifExistsCommand, elseCommand) {
      var script = "";
      script += "set -e\n";
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
      script += "set -e\n";
      script += "docker restart " + containerName + "\n";
      return module.exports.docker.ifExists(containerName, script);
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
      script += "set -e\n";
      script += "docker stop " + containerName + "\n";
      script += "docker rm -v " + containerName + "\n";
      return module.exports.docker.ifExists(containerName, script);
    },

    /*
     * Run a new container with the appropriate options.
     * 
     * @param {String} containerName - The name of the container to run.
     * @param {Object} instanceDef - The instance definition of the instance to start.
     *
     * @return {String} The script as a string.
     */
    run: function(containerName, instanceDef, mounts) {
      var hostDir = instanceDef.deployment.hostDir;
      var docker = instanceDef.deployment.value;

      var script = "";
      script += "set -e\n";

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

      docker.networks.forEach(function(network) {
        scriptArgs.push("--network " + network);
      });

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
      script += "set -e\n";
      script +=
        "docker exec -i " +
        containerName +
        " /bin/bash -s <<" +
        heredoc_2 +
        "\n";
      script += "set -e\n";
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
     * @param {String} sudo - Apply the command as sudo
    *
     * @return {String} The script as a string.
     */
    copy: function(containerName, source, destination, sudo) {
      var script = "";

      if (sudo) {
        script += "sudo ";
      }
      script += "docker cp " + source + " " + containerName + ":" + destination;

      return script + "\n";
    }
  },
  /**
   * Determines if a script should be run at a given stage and adds it to the final script
   *
   * @param {Array} script - The script to which to add the additional scripts (if any is found).
   * @param {Object} instanceDef - The instance definition of the instance to start.
   * @param {String} currentStage - The current stage in which the function is called.
   * @param {Object} config - The global config object (that informs for 'data', 'artifact', deployment' changes.
   * @param {Object} processEnv - The environment (usually process.env).
   *
   * @return {Object} computedScript - Returns an object that contains the initial passed script, appended with the scripts to apply at the current stage and if a final restart is required
   */
  computeAdditionalScripts(
    script,
    instanceDef,
    currentStage,
    config,
    processEnv
  ) {
    var changes = [];
    if (processEnv[config.varArtifactsChanges()] === "true") {
      changes.push("artifacts");
    }
    if (processEnv[config.varDeploymentChanges()] === "true") {
      changes.push("deployment");
    }
    if (processEnv[config.varDataChanges()] === "true") {
      changes.push("data");
    }

    // find scripts elements that match the corresponding changes
    var scriptsToRun = _.filter(instanceDef.scripts, function(item) {
      var matches = false;
      if (!_.isEmpty(_.intersection(item.conditions, changes))) {
        // ensure execution stage matches too
        if (item.executionStage === currentStage) {
          matches = true;
        }
      }
      return matches;
    });

    var ssh = instanceDef.deployment.host.value;
    var restartNeeded = false;

    scriptsToRun.forEach(function(item) {
      var deploymentTypeScripts = module.exports[instanceDef.deployment.type];
      var runScript = "";
      if (item.type === "shell") {
        runScript += module.exports.remote(
          ssh,
          deploymentTypeScripts.exec(instanceDef.uuid, item.value)
        );
      } else if (item.type === "python") {
        // TODO: to be implemented
      } else if (item.type === "sql") {
        // TODO: to be implemented
      }

      if (item.atStageStart === "true") {
        script.unshift(runScript);
      } else {
        script.push(runScript);
      }

      if (item.restart === "true") {
        restartNeeded += true;
      }
    });

    var computedScript = {
      script: script,
      restartNeeded: restartNeeded
    };
    return computedScript;
  },
  applyData(instanceDef) {
    var script = [];
    switch (type) {
      case "sql":
        var sql = data.value;
        var randomFolderName = utils
          .random()
          .toString(36)
          .slice(-5);
        var destFolder = "/tmp/" + randomFolderName + "/";
        script.push(
          container.exec(instanceDef.uuid, "mkdir -p " + destFolder) +
            "\n" +
            container.copy(instanceDef.uuid, sql.sourceFile, destFolder)
        );
        var sqlCmd = "";
        var waitForMySQL = "";
        var sourceFilePath = destFolder + path.basename(sql.sourceFile);
        switch (sql.engine) {
          case "mysql":
            script.push(module.exports.mySqlRestore(sourceFilePath, sql));
          case "bahmni":
            script.push(module.exports.bahmniRestore(sourceFilePath, sql));
        }
    }
    return script;
  },
  mySqlRestore(sourceFolder, sourceFile, sql) {
    var waitForMySQL =
      "until ncat -w30 localhost 3306 --send-only </dev/null; do echo 'Waiting for database connection...'; sleep 5; done";
    var cat = "cat";
    if (sourceFile.endsWith(".gz")) {
      cat = "zcat";
    }
    var stopService = "sleep 30s; service " + sql.database + " stop";

    var applySqlCommand =
      cat +
      " " +
      module.exports.trailSlash(sourceFolder, true) +
      sourceFile +
      " | " +
      sql.engine +
      " -u" +
      sql.user +
      " -p" +
      sql.password +
      " " +
      sql.database;

    return waitForMySQL + "\n" + stopService + "\n" + applySqlCommand;
  },
  bahmniRestore(sourceFolder, sourceFile, sql) {
    var dataPath = "/data/" + sql.database + "/";
    var createDataFolder = "mkdir -p " + dataPath;
    var moveFileInDataFolder =
      "mv " +
      module.exports.trailSlash(sourceFolder, true) +
      sourceFile +
      " " +
      dataPath +
      sourceFile;
    var bahmniRestore =
      "bahmni -i local restore --restore_type=db --options=" +
      sql.database +
      " --strategy=dump --restore_point=" +
      sourceFile;

    return (
      createDataFolder + "\n" + moveFileInDataFolder + "\n" + bahmniRestore
    );
  },
  dockerApacheMacro: {
    createProxy(proxy, maintenanceUrl, selinux) {
      var apacheConfFolder =
        module.exports.trailSlash(proxy.confFolder, true) + "use_macro";
      var sudo = "sudo su";
      var apacheConfFile = "10-" + proxy.port + ".conf";
      var apacheConf = "";
      apacheConf +=
        "Use " +
        proxy.macroName +
        " " +
        proxy.port +
        " " +
        proxy.targetUrl +
        " " +
        maintenanceUrl +
        " maintenance_off";

      var semanage = "";
      if (selinux == "true") {
        semanage =
          "semanage port -a -t http_port_t -p tcp " + proxy.port + "\n";
      }

      return (
        sudo +
        "\n" +
        "echo -e '" +
        apacheConf +
        "' > " +
        apacheConfFolder +
        "/" +
        apacheConfFile +
        "\n" +
        semanage +
        module.exports.dockerApacheMacro.reload(proxy)
      );
    },
    reload(proxy) {
      return module.exports.docker.exec(
        proxy.containerName,
        "apachectl graceful"
      );
    },
    maintenance(mode, proxy) {
      var apacheConfFile = "10-" + proxy.port + ".conf";
      var array = ["on", "off"];
      if (mode) {
        array = ["off", "on"];
      }
      return (
        "sudo su\n" +
        "sed -i 's/maintenance_" +
        array[0] +
        "/maintenance_" +
        array[1] +
        "/g' " +
        proxy.confFolder +
        "/use_macro/" +
        apacheConfFile +
        "\n" +
        module.exports.dockerApacheMacro.reload(proxy)
      );
    }
  }
};
