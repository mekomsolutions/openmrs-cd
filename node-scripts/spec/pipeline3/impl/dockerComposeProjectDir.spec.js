"use strict";

describe("Docker Compose Generic Deployment implementation", function() {
  // deps
  const path = require("path");
  const config = require(path.resolve("src/utils/config"));
  const cst = require(path.resolve("src/const"));
  const dockerCompose = require(path.resolve(
    "src/pipeline3/impl/dockerComposeProjectDir"
  ));

  const scripts = require(path.resolve(
    "src/" + config.getJobNameForPipeline3() + "/scripts"
  ));

  var instanceDef = {
    uuid: "336af1ee-90a1-4d1b-baaf-db12c84deec0",
    name: "cambodia1",
    type: "dev",
    group: "tlc",
    deployment: {
      hostDir: "/var/docker-volumes/",
      type: "dockerComposeProjectDir",
      composePlugin: true,
      dockerComposeFiles: ["docker-compose.yml", "docker-compose-2.yml"],
      envFiles: ["env-file-1", "env-file-2"],
      value: {
        projectPath: "/var/docker-volumes/artifacts/run/docker",
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
  it("should use the correct compose command if composePlugin is set to true", () => {
    var expected = "docker compose";
    expect(dockerCompose.composeExec(true)).toEqual(expected);
  });

  it("should use the correct compose command if composePlugin is set to false", () => {
    var expected = "docker-compose";
    expect(dockerCompose.composeExec(false)).toEqual(expected);
  });

  it("should generate the correct compose command given multiple docker compose files", () => {
    var expected = " -f docker-compose.yml -f docker-compose-2.yml ";
    expect(
      dockerCompose.combineComposeFiles(
        instanceDef.deployment.dockerComposeFiles
      )
    ).toEqual(expected);
  });
  it("should generate Pre-Host Preparation deployment script", () => {
    var expected = "";
    expected += scripts.initFolder(
      config.getCDDockerDirPath(instanceDef.uuid),
      "jenkins",
      "jenkins",
      true
    );

    expect(
      dockerCompose.preHostPreparation.getDeploymentScript(instanceDef)
    ).toEqual(expected);
  });

  it("should generate Host Preparation deployment script", () => {
    var expected = "";

    expected +=
      scripts.remote(
        instanceDef.deployment.host.value,
        scripts.writeProperty(
          "TIMEZONE",
          instanceDef.deployment.timezone,
          path
            .resolve(instanceDef.deployment.value.projectPath, ".env")
            .toString()
        )
      ) + "\n";

    expected +=
      scripts.remote(
        instanceDef.deployment.host.value,
        scripts.createEnvVarFileDockerGeneric(instanceDef)
      ) +
      "\n" +
      scripts.remote(
        instanceDef.deployment.host.value,
        "cd " +
          path.resolve(instanceDef.deployment.value.projectPath).toString() +
          " && docker compose -p " +
          instanceDef.name +
          " -f docker-compose.yml -f docker-compose-2.yml " +
          " --env-file=env-file-1 --env-file=env-file-2 --env-file=/var/docker-volumes/artifacts/run/docker/cambodia1.env" +
          " build --pull proxy openmrs mysql" +
          "\n"
      ) +
      scripts.remote(
        instanceDef.deployment.host.value,
        "cd " +
          path.resolve(instanceDef.deployment.value.projectPath).toString() +
          " && docker compose -p " +
          instanceDef.name +
          " -f docker-compose.yml -f docker-compose-2.yml " +
          " --env-file=env-file-1 --env-file=env-file-2 --env-file=/var/docker-volumes/artifacts/run/docker/cambodia1.env" +
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
    let generated = dockerCompose.hostPreparation.getDeploymentScript(
      instanceDef
    );
    expect(generated).toEqual(expected);
  });
});
