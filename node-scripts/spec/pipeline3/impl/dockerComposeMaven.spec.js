"use strict";

describe("Docker Compose implementation", function() {
  // deps
  const path = require("path");
  const config = require(path.resolve("src/utils/config"));
  const cst = require(path.resolve("src/const"));
  const dockerCompose = require(path.resolve(
    "src/pipeline3/impl/dockerComposeMaven"
  ));

  const scripts = require(path.resolve(
    "src/" + config.getJobNameForPipeline3() + "/scripts"
  ));

  var instanceDef = {
    uuid: "cacb5448-46b0-4808-980d-5521775671c0",
    name: "cambodia1",
    type: "dev",
    group: "tlc",
    deployment: {
      hostDir: "/var/docker-volumes/",
      type: "dockerComposeMaven",
      value: {
        mavenProject: "http://someUrl",
        services: ["proxy", "openmrs", "mysql"]
      },
      timezone: "Europe/Amsterdam",
      host: {
        type: "ssh",
        value: {
          ip: "hsc-dev.mekomsolutions.net",
          user: "mekom",
          port: "22"
        }
      }
    },
    data: [
      {
        type: "sqlDocker",
        value: {
          service: "mysql",
          sourceFile: "/var/instance-data/sql-script.sql"
        }
      }
    ]
  };

  it("should generate Host Preparation deployment script", () => {
    instanceDef.deployment.value.mavenProject = {
      version: "1.0.0-SNAPSHOT",
      artifactId: "bahmni-docker-compose",
      groupId: "net.mekomsolutions",
      packaging: "zip"
    };

    let expected =
      scripts.remote(
        instanceDef.deployment.host.value,
        scripts.fetchArtifact(
          instanceDef.deployment.value.mavenProject,
          "maven",
          path
            .resolve(
              instanceDef.deployment.hostDir,
              instanceDef.name,
              "bahmni_docker"
            )
            .toString()
        )
      ) +
      scripts.remote(
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
      ) +
      "\n" +
      scripts.remote(
        instanceDef.deployment.host.value,
        scripts.createEnvVarFile(instanceDef)
      ) +
      "\n" +
      scripts.remote(
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
          " build --pull proxy openmrs mysql" +
          "\n"
      ) +
      scripts.remote(
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
          " pull proxy openmrs mysql" +
          "\n"
      ) +
      scripts.remote(
        instanceDef.deployment.host.value,
        "sudo chown -R root:root " +
          path
            .resolve(instanceDef.deployment.hostDir, instanceDef.name)
            .toString()
      );

    expect(
      dockerCompose.hostPreparation.getDeploymentScript(instanceDef)
    ).toEqual(expected);
  });
});
