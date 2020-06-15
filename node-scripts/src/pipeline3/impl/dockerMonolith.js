"use strict";

const _ = require("lodash");

const cst = require("../../const");
const heredoc_2 = cst.HEREDOC_2;
const utils = require("../../utils/utils");
/**
 * Implementation of script utils to specifically manipulate Docker containers.
 */
module.exports = {
  // PreHost Preparation
  preHostPreparation: {
    getDeploymentScript: function(instanceDef) {
      // TODO: 'docker' deployment should fetch image at this stage and load it at hostPreparation stage
      return "";
    },
    getDataScript: function(instanceDef) {
      return "";
    },
    getArtifactsScript: function(instanceDef) {
      return "";
    }
  },
  // Host Preparation
  hostPreparation: {
    getDeploymentScript: function(instanceDef) {
      var script = require("../scripts").remote(
        instanceDef.deployment.host.value,
        require("./dockerMonolith").pull(
          instanceDef.deployment.value.image,
          instanceDef.deployment.value.tag
        )
      );
      return script;
    },
    getDataScript: function(instanceDef) {
      return "";
    },
    getArtifactsScript: function(instanceDef) {
      return "";
    }
  },
  // Start Instance
  startInstance: {
    getDeploymentScript: function(instanceDef) {
      var scripts = require("../scripts");
      var ssh = instanceDef.deployment.host.value;
      var script = "";
      script += scripts.remote(
        instanceDef.deployment.host.value,
        module.exports.remove(instanceDef)
      );
      script += "\n";
      var mounts = {
        "/mnt": instanceDef.deployment.hostDir
      };

      var setTLS = "";

      if (!_.isEmpty(instanceDef.deployment.tls)) {
        var tls = instanceDef.deployment.tls;
        if (tls.type === "file") {
          mounts[
            scripts.trailSlash(tls.value.keysFolder, false)
          ] = scripts.trailSlash(tls.value.hostKeysFolder, false);
        }
        setTLS += scripts.remote(
          instanceDef.deployment.host.value,
          module.exports.exec(
            instanceDef,
            scripts.logInfo("Configuring TLS certs") +
              tls.value.webServerUpdateScript +
              " " +
              tls.value.webServerConfFile +
              " " +
              scripts.trailSlash(tls.value.keysFolder, true) +
              tls.value.privateKeyFilename +
              " " +
              scripts.trailSlash(tls.value.keysFolder, true) +
              tls.value.publicCertFilename +
              " " +
              scripts.trailSlash(tls.value.keysFolder, true) +
              tls.value.chainCertsFilename
          )
        );
      }
      script += scripts.remote(
        instanceDef.deployment.host.value,
        module.exports.run(instanceDef, mounts)
      );
      script += setTLS;

      if (instanceDef.deployment.timezone) {
        script +=
          "\n" +
          scripts.remote(
            ssh,
              module.exports.exec(
              instanceDef,
              scripts.setTimezone(instanceDef.deployment.timezone)
            )
          );
      }

      return script;
    },
    getDataScript: function(instanceDef) {
      if (!instanceDef.data) return "";
      const scripts = require("../scripts");

      const path = require("path");
      var script = "";
      var ssh = instanceDef.deployment.host.value;
      instanceDef.data.forEach(function(data) {
        var applyData = {
          instance: function() {
            // Nothing to do when providing an 'instance'. the data folder copy
            // has already been done at hostPreparation step
          },
          sql: function() {
            var sql = data.value;
            var randomFolderName = utils
              .random()
              .toString(36)
              .slice(-5);
            var destFolder = "/tmp/" + randomFolderName + "/";
            Object.assign(ssh, { remoteDst: false, remoteSrc: false });
            script += scripts.remote(
              ssh,
              module.exports.exec(instanceDef, "mkdir -p " + destFolder) +
                "\n" +
                module.exports.copy(instanceDef, sql.sourceFile, destFolder)
            );

            var applyEngine = {
              mysql: function() {
                script += scripts.remote(
                  ssh,
                  module.exports.exec(
                    instanceDef,
                    scripts.mySqlRestore(
                      destFolder,
                      path.basename(sql.sourceFile),
                      sql
                    )
                  )
                );
              },
              bahmni: function() {
                script += scripts.remote(
                  ssh,
                  module.exports.exec(
                    instanceDef,
                    scripts.bahmniRestore(
                      destFolder,
                      path.basename(sql.sourceFile),
                      sql
                    )
                  )
                );
              }
            };

            applyEngine[sql.engine]();
          }
        };
        applyData[data.type]();
      });
      return script;
    },
    getArtifactsScript: function(instanceDef) {
      return "";
    }
  },

  /**
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
  /**
   * Generates a script that pulls a Docker image
   *
   * @param {String} image - The name of the image to pull
   * @param {String} tag - The tag of the image to pull
   *
   * @return {String} The script as a string.
   */
  pull: function(image, tag) {
    var script = "";
    script = "docker pull " + image + ":" + tag + "\n";
    return script;
  },

  /**
   * Generates a script that restarts the passed container.
   *
   * @param {String} containerName - The name of the container to restart.
   *
   * @return {String} The script as a string.
   */
  restart: function(instanceDef) {
    var script = "";
    script += "set -e\n";
    script += "docker restart " + instanceDef.uuid + "\n";
    return this.ifExists(instanceDef.uuid, script);
  },

  /**
   * Generates a script to remove the passed container.
   *
   * @param {String} containerName - The name of the container to remove.
   *
   * @return {String} The script as a string.
   */
  remove: function(instanceDef) {
    var script = "";
    script += "set -e\n";
    script += "docker stop " + instanceDef.uuid + "\n";
    script += "docker rm -v " + instanceDef.uuid + "\n";
    return module.exports.ifExists(instanceDef.uuid, script);
  },

  /**
   * Run a new container with the appropriate options.
   *
   * @param {String} containerName - The name of the container to run.
   * @param {Object} instanceDef - The instance definition of the instance to start.
   *
   * @return {String} The script as a string.
   */
  run: function(instanceDef, mounts) {
    const docker = instanceDef.deployment.value;

    var script = "";
    script += "set -e\n";

    var scriptArgs = [];
    scriptArgs.push("docker run -dit");

    if (docker.privileged == "true") {
      scriptArgs.push("--privileged");
      scriptArgs.push("-v /sys/fs/cgroup:/sys/fs/cgroup:ro");
    }

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

    scriptArgs.push("--name " + instanceDef.uuid);
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

  /**
   * Executes the passed shell command into the container.
   *
   * @param {String} containerName - The name of the container on which to execute the command.
   * @param {String} command - The command to execute.
   *
   * @return {String} The script as a string.
   */
  exec: function(instanceDef, command) {
    var script = "";
    script += "set -e\n";
    script +=
      "docker exec -i " +
      instanceDef.uuid +
      " /bin/bash -s <<" +
      heredoc_2 +
      "\n";
    script += "set -e\n";
    script += command + "\n";
    script += heredoc_2;

    return script + "\n";
  },

  /**
   * Copy 'source' located on the host to the container's 'destination'.
   *
   * @param {String} containerName - The name of the container onto which to copy the data.
   * @param {String} source - The source file to be copied on the container.
   * @param {String} destination - The destination location for this file.
   * @param {String} sudo - Apply the command as sudo
   *
   * @return {String} The script as a string.
   */
  copy: function(instanceDef, source, destination, sudo) {
    var script = "";

    if (sudo) {
      script += "sudo ";
    }
    script +=
      "docker cp " + source + " " + instanceDef.uuid + ":" + destination;

    return script + "\n";
  },
  setProperties: function(instanceDef, property, output) {
    var script = "";
    var path = require("path");
    var propPath = path.resolve(property.path, property.filename).toString();
    script += require("../scripts").remote(
      instanceDef.deployment.host.value,
      module.exports.exec(instanceDef, "echo '" + output + "' > " + propPath)
    );
    return script;
  },
  setLinks: function(instanceDef) {
    return require("../scripts").remote(
      instanceDef.deployment.host.value,
      module.exports.exec(
        instanceDef,
        require("../scripts").linkComponents(instanceDef.deployment.links)
      )
    );
  }
};
