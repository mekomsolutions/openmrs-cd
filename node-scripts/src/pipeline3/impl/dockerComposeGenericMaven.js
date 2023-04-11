"use strict";

const path = require("path");
const _ = require("lodash");

const cst = require("../../const");
const scripts = require("../scripts");
const config = require(cst.CONFIGPATH);
const heredoc_2 = cst.HEREDOC_2;

const composeExec = function(composePlugin) {
  let exec = "docker-compose";
  if (composePlugin) {
    exec = "docker compose";
  }
  return exec;
};

const combineComposeFiles = function(composeFiles = []) {
  let dockerComposeFiles = "";
  for (const composeFile of composeFiles) {
    dockerComposeFiles = dockerComposeFiles + ` -f ${composeFiles} `;
  }
  return dockerComposeFiles;
};
/**
 * Implementation of script utils to specifically manipulate Docker Compose containers.
 *
 */
module.exports = {
  preHostPreparation: {
    getDeploymentScript: function(instanceDef) {
      // Retrieve the  Docker Compose project
      const mavenProject = instanceDef.deployment.value.mavenProject;
      const dockerDirPath = path.resolve(
        config.getCDDockerDirPath(instanceDef.uuid)
      );
      var script = "";
      script += scripts.initFolder(dockerDirPath, "jenkins", "jenkins", true);
      script += scripts.fetchArtifact(
        mavenProject,
        "maven",
        dockerDirPath,
        instanceDef.deployment.value.mavenUrl
      );
      return script;
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

      // Rsync the  Docker Compose project files to the target machine
      const hostDir = path.resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name
      );
      const ssh = instanceDef.deployment.host.value;
      const hostArtifactsDir = hostDir + "/docker_compose";
      script += scripts.rsync(
        { ...ssh, ...{ remoteDst: true } },
        config.getCDDockerDirPath(instanceDef.uuid),
        hostArtifactsDir,
        true,
        null,
        "-avzz --delete"
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
                "docker_compose",
                ".env"
              )
              .toString()
          )
        );
      }

      script += "\n";
      script += scripts.remote(
        instanceDef.deployment.host.value,
        scripts.createEnvVarFileDockerGeneric(instanceDef)
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
              "docker_compose"
            )
            .toString() +
          " && " +
          composeExec(instanceDef.deployment.composePlugin) +
          " -p " +
          instanceDef.name +
          combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
              "docker_compose"
            )
            .toString() +
          " && " +
          composeExec(instanceDef.deployment.composePlugin) +
          " -p " +
          instanceDef.name +
          combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
              "docker_compose/sqls",
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
                    "docker_compose"
                  )
                  .toString() +
                " && " +
                composeExec(instanceDef.deployment.composePlugin) +
                " -p " +
                instanceDef.name +
                combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
                " && " +
                composeExec(instanceDef.deployment.composePlugin) +
                " -p " +
                instanceDef.name +
                combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
              "docker_compose"
            )
            .toString() +
          " && " +
          composeExec(instanceDef.deployment.composePlugin) +
          " -p " +
          instanceDef.name +
          combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
  ifExists: function() {},
  restart: function(instanceDef, sudo) {
    let script = "";
    let path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "docker_compose"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name +
      combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
        "docker_compose"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name;
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

  pull: function() {},
  exec: (instanceDef, command, service) => {
    let script = "";
    script += "set -e\n";
    var path = require("path");
    let distPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "docker_compose"
      )
      .toString();
    script += "cd " + distPath + " && ";
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name +
      combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
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
  setProperties: function(instanceDef, property, output) {
    let script = "";
    let path = require("path");
    let propPath = path
      .resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name,
        "docker_compose/properties/" + property.service
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
        "docker_compose"
      )
      .toString();
    script += "cd " + distPath + " && ";
    if (sudo) {
      script += "sudo ";
    }
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name +
      combineComposeFiles(instanceDef.deployment.dockerComposeFiles);
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
