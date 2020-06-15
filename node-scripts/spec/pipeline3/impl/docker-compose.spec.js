"use strict";

describe("Scripts", function() {
  // deps
  const path = require("path");
  const config = require(path.resolve("src/utils/config"));
  const cst = require(path.resolve("src/const"));
  const dockerCompose = require(path.resolve(
    "src/pipeline3/impl/dockerCompose"
  ));

  const scripts = require(path.resolve(
    "src/" + config.getJobNameForPipeline3() + "/scripts"
  ));

  describe("Pipeline steps", function() {
    var instanceDef = {
      uuid: "cacb5448-46b0-4808-980d-5521775671c0",
      name: "cambodia1",
      type: "dev",
      group: "tlc",
      deployment: {
        hostDir: "/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0",
        type: "dockerCompose",
        value: {
          image: "mekomsolutions/bahmni",
          tag: "cambodia-release-0.90",
          ports: {
            "443": "8733",
            "80": "8180"
          },
          networks: ["network1", "network2"]
        },
        host: {
          type: "ssh",
          value: {
            ip: "hsc-dev.mekomsolutions.net",
            user: "mekom",
            port: "22"
          }
        }
      }
    };

    it("should generate docker compose Pre-Host Preparation deployment script", () => {
      expect(
        dockerCompose.preHostPreparation.getDeploymentScript(instanceDef)
      ).toEqual(
        ""
      );
    });

    it("should generate docker compose Pre-Host Preparation data script", () => {
      expect(
        dockerCompose.preHostPreparation.getDataScript(instanceDef)
      ).toEqual("");
    });

    it("should generate docker compose Pre-Host Preparation artifacts script", () => {
      expect(
        dockerCompose.preHostPreparation.getArtifactsScript(instanceDef)
      ).toEqual("");
    });

    // fit("should generate docker compose Host Preparation deployment script", () => {
    //   console.log(dockerCompose.hostPreparation.getDeploymentScript(instanceDef))
    //   expect(
    //     dockerCompose.hostPreparation.getDeploymentScript(instanceDef)
    //   ).toEqual(
    //     scripts.remote(
    //       instanceDef.deployment.host.value,
    //       path.join(
    //         config.getCDDockerDirPath(instanceDef.uuid),
    //         "bahmni_docker"
    //       ),
    //       path.join(
    //         instanceDef.deployment.hostDir,
    //         instanceDef.name,
    //         "bahmni_docker"
    //       ),
    //       true
    //     ) +
    //       scripts.remote(
    //         instanceDef.deployment.host.value,
    //         path.join(
    //           config.getCDDockerDirPath(instanceDef.uuid),
    //           "bahmni_images"
    //         ),
    //         path.join(
    //           instanceDef.deployment.hostDir,
    //           instanceDef.name,
    //           "bahmni_images"
    //         ),
    //         true
    //       ) +
    //       scripts.remote(
    //         instanceDef.deployment.host.value,
    //         "docker load < /var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0/cambodia1/bahmni_images/cambodia1_images.tar\n"
    //       )
    //   );
    // });

    it("should generate docker compose Host Preparation data script", () => {
      expect(dockerCompose.hostPreparation.getDataScript(instanceDef)).toEqual(
        ""
      );
    });

    it("should generate docker compose Host Preparation artifacts script", () => {
      expect(
        dockerCompose.hostPreparation.getArtifactsScript(instanceDef)
      ).toEqual("");
    });

    it("should generate docker compose Start Instance deployment script", () => {
      expect(
        dockerCompose.startInstance.getDeploymentScript(instanceDef)
      ).toEqual(scripts.remote(instanceDef.deployment.host.value,
        "cd /var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0/cambodia1/bahmni_docker && " +
        "docker-compose -p cambodia1 --env-file=/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0/cambodia1/cambodia1.env up -d"
      ));
    });

    it("should generate docker compose Start Instance data script", () => {
      expect(dockerCompose.startInstance.getDataScript(instanceDef)).toEqual(
        ""
      );
    });

    it("should generate docker compose Start Instance artifacts script", () => {
      expect(
        dockerCompose.startInstance.getArtifactsScript(instanceDef)
      ).toEqual("");
    });
  });
});
