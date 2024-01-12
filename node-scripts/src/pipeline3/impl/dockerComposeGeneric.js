"use strict";

const path = require("path");
const _ = require("lodash");

const cst = require("../../const");
const scripts = require("../scripts");
const config = require(cst.CONFIGPATH);
const heredoc_2 = cst.HEREDOC_2;

const cdScript = function (instanceDef, sudo) {
  let path = require("path");
  let workDir = path
    .resolve(instanceDef.deployment.hostDir, instanceDef.name, "docker_compose")
    .toString();
  if (instanceDef.deployment.workDir) {
    workDir = instanceDef.deployment.workDir;
  }
  let script = "";
  script += "set -e\n";
  script += "cd " + workDir + " && ";
  if (sudo) {
    script += "sudo ";
  }
  return script;
};

const composeExec = function (composePlugin) {
  let exec = "docker-compose";
  if (composePlugin) {
    exec = "docker compose";
  }
  return exec;
};

const combineComposeFiles = function (composeFiles = []) {
  let dockerComposeFiles = " ";
  for (const composeFile of composeFiles) {
    dockerComposeFiles = dockerComposeFiles + `-f ${composeFile} `;
  }
  return dockerComposeFiles;
};

const combineEnvFiles = function (instanceDef = {}) {
  let files = " ";
  if (
    instanceDef &&
    instanceDef.deployment &&
    instanceDef.deployment.envFiles
  ) {
    for (const envFile of instanceDef.deployment.envFiles) {
      files = files + `--env-file=${envFile} `;
    }
  }
  files +
    "--env-file=" +
    path
      .resolve(
        instanceDef.deployment.workDir,
        instanceDef.name,
        instanceDef.name + ".env"
      )
      .toString();
  return files;
};

/**
 * Implementation of script utils to specifically manipulate Docker Compose containers.
 *
 */
module.exports = {
  preHostPreparation: {
    getDeploymentScript: function (instanceDef) {
      // Retrieve the  Docker Compose project
      const mavenProject = instanceDef.deployment.value.mavenProject;
      const dockerDirPath = path.resolve(
        config.getCDDockerDirPath(instanceDef.uuid)
      );
      var script = "";
      script += scripts.initFolder(dockerDirPath, "jenkins", "jenkins", true);
      if (mavenProject) {
        script += scripts.fetchArtifact(
          mavenProject,
          "maven",
          dockerDirPath,
          null
        );
      }
      return script;
    },
    getDataScript: function (instanceDef) {
      let script = "";

      return script;
    },
    getArtifactsScript: function (instanceDef) {
      return "";
    }
  },
  hostPreparation: {
    getDeploymentScript: function (instanceDef) {
      const scripts = require("../scripts");
      let script = "";

      // Rsync the  Docker Compose project files to the target machine
      const hostDir = path.resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name
      );
      const ssh = instanceDef.deployment.host.value;
      const hostArtifactsDir = hostDir + "/docker_compose";
      let workDir = path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          "docker_compose"
        )
        .toString();
      if (instanceDef.deployment.workDir) {
        workDir = instanceDef.deployment.workDir;
      }

      if (instanceDef.deployment.mavenProject) {
        script += scripts.rsync(
          { ...ssh, ...{ remoteDst: true } },
          config.getCDDockerDirPath(instanceDef.uuid),
          hostArtifactsDir,
          true,
          null,
          "-avzz --delete"
        );
      }
      // Set the Timezone via a env var "TIMEZONE"
      if (instanceDef.deployment.timezone) {
        script += scripts.remote(
          instanceDef.deployment.host.value,
          scripts.writeProperty(
            "TIMEZONE",
            instanceDef.deployment.timezone,
            path.resolve(instanceDef.deployment.workDir, ".env").toString()
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
        workDir +
        " && " +
        composeExec(instanceDef.deployment.composePlugin) +
        " -p " +
        instanceDef.name +
        combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
        combineEnvFiles(instanceDef) +
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
        workDir +
        " && " +
        composeExec(instanceDef.deployment.composePlugin) +
        " -p " +
        instanceDef.name +
        combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
        combineEnvFiles(instanceDef) +
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
    getDataScript: function (instanceDef) {
      var script = "";
      var ssh = instanceDef.deployment.host.value;
      let workDir = path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          "docker_compose"
        )
        .toString();
      if (instanceDef.deployment.workDir) {
        workDir = instanceDef.deployment.workDir;
      }
      instanceDef.data.forEach(function (data) {
        var applyData = {
          instance: function () {
            // 'instance' type must be handled differently as it requires access to the 'db'.
            // therefore, the script is provided in the 'stage' script (host-prepation.js, start-instance.js...)
          },
          sqlDocker: function () {
            let sql = data.value;
            let destFolder = path.resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "docker_compose/sqls",
              sql.service
            );
            if (sql.destinationDir) {
              destFolder = path.resolve(sql.destinationDir);
            }
            script += scripts.remote(
              ssh,
              "sudo cp " + sql.sourceFile + " " + destFolder + "\n"
            );
            script += scripts.remote(
              ssh,
              "cd " +
              workDir +
              " && " +
              composeExec(instanceDef.deployment.composePlugin) +
              " -p " +
              instanceDef.name +
              combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
              combineEnvFiles(instanceDef) +
              " rm -vsf " +
              sql.service +
              " && " +
              composeExec(instanceDef.deployment.composePlugin) +
              " -p " +
              instanceDef.name +
              combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
              combineEnvFiles(instanceDef) +
              " up -d " +
              sql.service
            );
          }
        };
        applyData[data.type]();
      });
      return script;
    },
    getArtifactsScript: function (instanceDef) {
      return "";
    }
  },
  startInstance: {
    getDeploymentScript: function (instanceDef) {
      let script = "";
      let workDir = path
        .resolve(
          instanceDef.deployment.hostDir,
          instanceDef.name,
          "docker_compose"
        )
        .toString();
      if (instanceDef.deployment.workDir) {
        workDir = instanceDef.deployment.workDir;
      }
      script += scripts.remote(
        instanceDef.deployment.host.value,
        "cd " +
        workDir +
        " && " +
        composeExec(instanceDef.deployment.composePlugin) +
        " -p " +
        instanceDef.name +
        combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
        combineEnvFiles(instanceDef) +
        " up -d" +
        require("./dockerCompose").getInstanceServicesAsStringList(
          instanceDef
        ) +
        "\n"
      );
      return script;
    },
    getDataScript: function (instanceDef) {
      return "";
    },
    getArtifactsScript: function (instanceDef) {
      return "";
    }
  },
  ifExists: function () { },
  restart: function (instanceDef, sudo) {
    let script = "";
    script += cdScript(instanceDef);
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name +
      combineComposeFiles(instanceDef.deployment.dockerComposeFiles) +
      combineEnvFiles(instanceDef) +
      " restart ";

    return script + "\n";
  },
  remove: function (instanceDef, sudo) {
    let script = "";
    script += cdScript(instanceDef);
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name;
    script += combineEnvFiles(instanceDef);
    var rmVolumes =
      instanceDef.type.toString() != cst.INSTANCETYPE_PROD ? " -v" : "";
    script += " down" + rmVolumes;
    return script + "\n";
  },
  down: function (instanceDef, sudo) {
    let script = "";
    script += cdScript(instanceDef, sudo);
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name;
    script += combineEnvFiles(instanceDef);
    script += " down";
    return script + "\n";
  },
  pull: function () { },
  exec: (instanceDef, command, service) => {
    let script = "";
    script += cdScript(instanceDef);
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
  setProperties: function (instanceDef, property, output) {
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
  setLinks: function () { },
  getInstanceServicesAsStringList: function (instanceDef) {
    let script = "";
    instanceDef.deployment.value.services.forEach(service => {
      script += " " + service.toString();
    });
    return script;
  },
  stop: function (instanceDef, sudo) {
    let script = "";
    script += cdScript(instanceDef);
    script +=
      composeExec(instanceDef.deployment.composePlugin) +
      " -p " +
      instanceDef.name +
      combineComposeFiles(instanceDef.deployment.dockerComposeFiles);
    script += combineEnvFiles(instanceDef);
    script += " stop";
    return script + "\n";
  },
  combineComposeFiles: combineComposeFiles,
  composeExec: composeExec
};
