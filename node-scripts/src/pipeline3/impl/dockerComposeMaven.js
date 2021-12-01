"use strict";

const path = require("path");
const _ = require("lodash");

const cst = require("../../const");
const scripts = require("../scripts");
const config = require(cst.CONFIGPATH);
const heredoc_2 = cst.HEREDOC_2;

const dockerComposeGit = require("./dockerComposeGit");
/**
 * Implementation of script utils to specifically manipulate Docker Compose containers.
 *
 */
module.exports = {
  preHostPreparation: {
    getDeploymentScript: function(instanceDef) {
      // Retrieve the Bahmni Docker Compose project
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
    getDataScript: dockerComposeGit.preHostPreparation.getDataScript,
    getArtifactsScript: dockerComposeGit.preHostPreparation.getArtifactsScript
  },
  hostPreparation: {
    getDeploymentScript: function(instanceDef) {
      const scripts = require("../scripts");
      let script = "";

      // Rsync the Bahmni Docker Compose project files to the target machine
      const hostDir = path.resolve(
        instanceDef.deployment.hostDir,
        instanceDef.name
      );
      const ssh = instanceDef.deployment.host.value;
      const hostArtifactsDir = hostDir + "/bahmni_docker";
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
    getDataScript: dockerComposeGit.hostPreparation.getDataScript,
    getArtifactsScript: dockerComposeGit.hostPreparation.getArtifactsScript
  },
  startInstance: dockerComposeGit.startInstance,
  ifExists: dockerComposeGit.ifExists,
  restart: dockerComposeGit.restart,
  remove: dockerComposeGit.remove,
  pull: dockerComposeGit.pull,
  exec: dockerComposeGit.exec,
  setProperties: dockerComposeGit.setProperties,
  setLinks: dockerComposeGit.setLinks,
  getInstanceServicesAsStringList:
    dockerComposeGit.getInstanceServicesAsStringList
};
