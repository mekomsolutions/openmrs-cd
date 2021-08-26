"use strict";

const path = require("path");
const _ = require("lodash");

const cst = require("../../const");
const scripts = require("../scripts");
const heredoc_2 = cst.HEREDOC_2;

const dockerComposeGit = require("./dockerComposeGit");
/**
 * Implementation of script utils to specifically manipulate Docker Compose containers.
 *
 */
module.exports = {
  preHostPreparation: dockerComposeGit.preHostPreparation,
  hostPreparation: {
    getDeploymentScript: function(instanceDef) {
      const scripts = require("../scripts");
      let script = "";

      // mvn dependency:get and copy
      const mavenProject = instanceDef.deployment.value.mavenProject;
      script += scripts.remote(
        instanceDef.deployment.host.value,
        scripts.fetchArtifact(
          mavenProject,
          "maven",
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker"
            )
            .toString(),
          instanceDef.deployment.value.mavenUrl
        )
      );

      // Set the Timezone via a env var "TZ"
      if (instanceDef.deployment.timezone) {
        script += scripts.remote(
          instanceDef.deployment.host.value,
          scripts.writeProperty(
            "TZ",
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
