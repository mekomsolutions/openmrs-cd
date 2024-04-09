"use strict";

const path = require("path");
const _ = require("lodash");

const cst = require("../../const");
const scripts = require("../scripts");
const heredoc_2 = cst.HEREDOC_2;

/**
 * Implementation of script utils to specifically manipulate Docker Compose containers.
 *
 */
module.exports = {
  preHostPreparation: {
    getDeploymentScript: function(instanceDef) {
      return "";
    },
    getDataScript: function(instanceDef) {
      let script = "";

      return script;
    },
    getArtifactsScript: function(instanceDef) {
      return "";
    }
  },
  hostPreparation: {
    getDeploymentScript: function(instanceDef) {
      const scripts = require("../scripts");
      let script = "";

      // git clone https://.../bahmni-docker
      const gitRepo = instanceDef.deployment.value.gitUrl;
      script += scripts.remote(
        instanceDef.deployment.host.value,
        scripts.gitClone(
          gitRepo,
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker"
            )
            .toString(),
          instanceDef.deployment.value.commitId
        )
      );

      // Set the Timezone via a env var "TIMEZONE"
      if (instanceDef.deployment.timezone) {
        script += scripts.remote(
          instanceDef.deployment.host.value,
          scripts.writeProperty(
            "TIMEZONE",
            instanceDef.deployment.timezone,
            path
              .resolve(
                instanceDef.deployment.hostDir,
                instanceDef.name,
                "bahmni_docker",
                ".env"
              )
              .toString()
          )
        );
      }

      script += "\n";
      script += scripts.remote(
        instanceDef.deployment.host.value,
        scripts.createEnvVarFile(instanceDef)
      );
      script += "\n";

      // docker-compose build
      script += scripts.remote(
        instanceDef.deployment.host.value,
        "cd " +
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker"
            )
            .toString() +
          " && docker-compose -p " +
          instanceDef.name +
          " --env-file=" +
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              instanceDef.name + ".env"
            )
            .toString() +
          " build --pull" +
          require("./dockerCompose").getInstanceServicesAsStringList(
            instanceDef
          ) +
          "\n"
      );

      // docker-compose pull
      script += scripts.remote(
        instanceDef.deployment.host.value,
        "cd " +
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker"
            )
            .toString() +
          " && docker-compose -p " +
          instanceDef.name +
          " --env-file=" +
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              instanceDef.name + ".env"
            )
            .toString() +
          " pull" +
          require("./dockerCompose").getInstanceServicesAsStringList(
            instanceDef
          ) +
          "\n"
      );

      script += scripts.remote(
        instanceDef.deployment.host.value,
        "sudo chown -R root:root " +
          path
            .resolve(instanceDef.deployment.hostDir, instanceDef.name)
            .toString()
      );

      return script;
    },
    getDataScript: function(instanceDef) {
      var script = "";
      var ssh = instanceDef.deployment.host.value;
      instanceDef.data.forEach(function(data) {
        var applyData = {
          instance: function() {
            // 'instance' type must be handled differently as it requires access to the 'db'.
            // therefore, the script is provided in the 'stage' script (host-prepation.js, start-instance.js...)
          },
          sqlDocker: function() {
            let sql = data.value;
            let destFolder = path.resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker/sqls",
              sql.service
            );
            script += scripts.remote(
              ssh,
              "sudo cp " + sql.sourceFile + " " + destFolder + "\n"
            );
            script += scripts.remote(
              ssh,
              "cd " +
                path
                  .resolve(
                    instanceDef.deployment.hostDir,
                    instanceDef.name,
                    "bahmni_docker"
                  )
                  .toString() +
                " && docker-compose -p " +
                instanceDef.name +
                " --env-file=" +
                path
                  .resolve(
                    instanceDef.deployment.hostDir,
                    instanceDef.name,
                    instanceDef.name + ".env"
                  )
                  .toString() +
                " rm -vsf " +
                sql.service +
                " && docker-compose -p " +
                instanceDef.name +
                " --env-file=" +
                path
                  .resolve(
                    instanceDef.deployment.hostDir,
                    instanceDef.name,
                    instanceDef.name + ".env"
                  )
                  .toString() +
                " up -d " +
                sql.service
            );
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
  startInstance: {
    getDeploymentScript: function(instanceDef) {
      let script = "";
      script += scripts.remote(
        instanceDef.deployment.host.value,
        "cd " +
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker"
            )
            .toString() +
          " && " +
          "docker-compose -p " +
          instanceDef.name +
          " --env-file=" +
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              instanceDef.name + ".env"
            )
            .toString() +
          " up -d" +
          require("./dockerCompose").getInstanceServicesAsStringList(
            instanceDef
          ) +
          "\n"
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
  /**
   * Util function that wraps the passed commands so each is applied either accordingly.
   *
   * @param {String} containerName - The name of the container.
   * @param {String} ifExistsCommand - The command that should run if the container exists.
   * @param {String} elseCommand - The command that will run if the container does *not* exist.
   *
   * @return {String} The script as a string.
   */
  ifExists: function() {},
  restart: function(instanceDef, sudo) {
    let script = "";
    let path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "bahmni_docker"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script +=
      "docker-compose -p " +
      instanceDef.name +
      " --env-file=" +
      path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          instanceDef.name + ".env"
        )
        .toString() +
      " restart ";

    return script + "\n";
  },
  remove: function(instanceDef, sudo) {
    let script = "";
    let path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "bahmni_docker"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script += "docker-compose -p " + instanceDef.name;
    script +=
      " --env-file=" +
      path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          instanceDef.name + ".env"
        )
        .toString();
    var rmVolumes =
      instanceDef.type.toString() != cst.INSTANCETYPE_PROD ? " -v" : "";
    script += " down" + rmVolumes;
    return script + "\n";
  },
  down: function(instanceDef, sudo) {
    let script = "";
    let path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "bahmni_docker"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script += "docker-compose -p " + instanceDef.name;
    script +=
      " --env-file=" +
      path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          instanceDef.name + ".env"
        )
        .toString();
    script += " down";
    return script + "\n";
  },

  pull: function() {},
  exec: (instanceDef, command, service) => {
    let script = "";
    script += "set -e\n";
    var path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "bahmni_docker"
      )
      .toString();
    script += "cd " + distPath + " && ";
    script +=
      "docker-compose -p " +
      instanceDef.name +
      " exec -T " +
      service +
      " /bin/bash -s <<" +
      heredoc_2 +
      "\n";
    script += "set -e\n";
    script += command + "\n";
    script += heredoc_2;

    return script + "\n";
  },
  hostExec: command => {
    let script = "";
    script += command + "\n";
    return script + "\n";
  },
  setProperties: function(instanceDef, property, output) {
    let script = "";
    let path = require("path");
    let propPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "bahmni_docker/properties/" + property.service
      )
      .toString();
    let propFilePath = path.resolve(propPath, property.filename).toString();
    script += require("../scripts").remote(
      instanceDef.deployment.host.value,
      "\n" +
        "if [[ ! -e " +
        propFilePath +
        " ]]; then\n" +
        "sudo mkdir -p " +
        propPath +
        "\n" +
        "sudo touch " +
        propFilePath +
        "\n" +
        "fi\n" +
        "sudo bash -c 'cat > " +
        propFilePath +
        " <<EOF \n" +
        output +
        "\nEOF'\n"
    );
    return script;
  },
  setLinks: function() {},
  getInstanceServicesAsStringList: function(instanceDef) {
    let script = "";
    instanceDef.deployment.value.services.forEach(service => {
      script += " " + service.toString();
    });
    return script;
  },
  stop: function(instanceDef, sudo) {
    let script = "";
    let path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "bahmni_docker"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script += "docker-compose -p " + instanceDef.name;
    script +=
      " --env-file=" +
      path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          instanceDef.name + ".env"
        )
        .toString();
    script += " stop";
    return script + "\n";
  }
};
