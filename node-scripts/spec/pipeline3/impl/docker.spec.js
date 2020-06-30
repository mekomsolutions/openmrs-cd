"use strict";

describe("Scripts", function() {
  // deps

  const path = require("path");
  const proxyquire = require("proxyquire");

  const config = require(path.resolve("src/utils/config"));
  const utils = require(path.resolve("src/utils/utils"));
  const cst = require(path.resolve("src/const"));
  const dockerContainer = require(path.resolve(
    "src/pipeline3/impl/dockerMonolith"
  ));
  const heredoc_2 = cst.HEREDOC_2;

  const instanceDef = {
    uuid: "cacb5448-46b0-4808-980d-5521775671c0",
    type: "dev",
    name: "cambodia1",
    group: "tlc",
    deployment: {
      hostDir: "/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0",
      type: "docker",
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

  const scripts = require(path.resolve(
    "src/" + config.getJobNameForPipeline3() + "/scripts"
  ));

  it("should generate Docker run command", function() {
    var mounts = {
      "/mnt": instanceDef.deployment.hostDir
    };

    expect(dockerContainer.run(instanceDef, mounts)).toEqual(
      "set -e\n" +
        "docker run -dit --restart unless-stopped " +
        "--publish 8180:80 --publish 8733:443 --label type=dev --label group=tlc " +
        "--name cacb5448-46b0-4808-980d-5521775671c0 --hostname bahmni --network network1 --network network2 " +
        "--mount type=bind,source=/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0,target=/mnt " +
        "mekomsolutions/bahmni:cambodia-release-0.90\n"
    );

    instanceDef.deployment.value.privileged = "true";
    expect(dockerContainer.run(instanceDef, mounts)).toContain("--privileged");
    expect(dockerContainer.run(instanceDef, mounts)).toContain(
      "-v /sys/fs/cgroup:/sys/fs/cgroup:ro"
    );
  });

  it("should generate ifExists wrapper", function() {
    expect(dockerContainer.ifExists("cambodia1", "cmd1\n", "cmd2\n")).toEqual(
      "set -e\n" +
        "container=\\$(docker ps -a --filter name=cambodia1 --format {{.Names}})\n" +
        'if [ "\\$container" == "cambodia1" ]\n' +
        "then cmd1\n" +
        "else cmd2\n" +
        "fi\n"
    );
    expect(dockerContainer.ifExists("cambodia1")).toEqual(
      "set -e\n" +
        "container=\\$(docker ps -a --filter name=cambodia1 --format {{.Names}})\n" +
        'if [ "\\$container" == "cambodia1" ]\n' +
        "then echo\n" +
        "else echo\n" +
        "fi\n"
    );
  });

  it("should generate Docker restart command", function() {
    expect(dockerContainer.restart(instanceDef)).toEqual(
      dockerContainer.ifExists(
        instanceDef.uuid,
        "set -e\n" + "docker restart " + instanceDef.uuid + "\n"
      )
    );
  });

  it("should generate Docker remove command", function() {
    expect(dockerContainer.remove(instanceDef)).toEqual(
      dockerContainer.ifExists(
        instanceDef.uuid,
        "set -e\ndocker stop " +
          instanceDef.uuid +
          "\ndocker rm -v " +
          instanceDef.uuid +
          "\n"
      )
    );
  });

  it("should generate Docker exec command", function() {
    expect(dockerContainer.exec(instanceDef, "echo 'test'")).toEqual(
      "set -e\n" +
        "docker exec -i " +
        instanceDef.uuid +
        " /bin/bash -s <<" +
        heredoc_2 +
        "\n" +
        "set -e\n" +
        "echo 'test'\n" +
        heredoc_2 +
        "\n"
    );
  });

  it("should generate Docker copy command", function() {
    expect(
      dockerContainer.copy(instanceDef, "/tmp/test1", "/tmp/test2")
    ).toEqual("docker cp /tmp/test1 " + instanceDef.uuid + ":/tmp/test2\n");
  });

  // Tests for Docker Pipeline steps

  describe("Pipeline steps", function() {
    var instanceDef = {
      uuid: "f95cb053-cf6e-4fd6-a531-e9cf7bfabb45",
      type: "dev",
      name: "cambodia1",
      group: "tlc",
      deployment: {
        hostDir: "/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0",
        type: "docker",
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
      },
      data: [
        {
          type: "instance",
          value: {
            uuid: "50b6cf72-0e80-457d-8141-a0c8c85d4dae",
            dataDir: null
          }
        },
        {
          type: "sql",
          value: {
            engine: "mysql",
            database: "openmrs",
            sourceFile: "/var/reference-data/demo-data.sql",
            user: "root",
            password: "password"
          }
        }
      ],
      properties: [
        {
          filename: "erp.properties",
          path: "/opt/openmrs/",
          properties: {
            "erp.database": "odoo",
            "erp.username": "admin"
          }
        }
      ]
    };

    it("should generate Docker Pre-Host Preparation deployment script", () => {
      expect(
        dockerContainer.preHostPreparation.getDeploymentScript(instanceDef)
      ).toEqual("");
    });

    it("should generate Docker Pre-Host Preparation data script", () => {
      expect(
        dockerContainer.preHostPreparation.getDataScript(instanceDef)
      ).toEqual("");
    });

    it("should generate Docker Pre-Host Preparation artifacts script", () => {
      expect(
        dockerContainer.preHostPreparation.getArtifactsScript(instanceDef)
      ).toEqual("");
    });

    it("should generate Docker Host Preparation deployment script", () => {
      expect(
        dockerContainer.hostPreparation.getDeploymentScript(instanceDef)
      ).toEqual(
        scripts.remote(
          instanceDef.deployment.host.value,
          dockerContainer.pull(
            instanceDef.deployment.value.image,
            instanceDef.deployment.value.tag
          )
        )
      );
    });

    it("should generate Docker Host Preparation data script", () => {
      expect(
        dockerContainer.hostPreparation.getDataScript(instanceDef)
      ).toEqual("");
    });

    it("should generate Docker Host Preparation artifacts script", () => {
      expect(
        dockerContainer.hostPreparation.getArtifactsScript(instanceDef)
      ).toEqual("");
    });

    it("should generate Docker Start Instance deployment script", () => {
      expect(
        dockerContainer.startInstance.getDeploymentScript(instanceDef)
      ).toEqual(
        scripts.remote(
          instanceDef.deployment.host.value,
          dockerContainer.remove(instanceDef)
        ) +
          "\n" +
          scripts.remote(
            instanceDef.deployment.host.value,
            "set -e\n" +
              "docker run -dit --restart unless-stopped --publish 8180:80 --publish 8733:443 --label type=dev --label group=tlc --name " +
              instanceDef.uuid +
              " --hostname bahmni --network network1 --network network2 --mount type=bind,source=/var/docker-volumes/cacb5448-46b0-4808-980d-5521775671c0/cambodia1,target=/mnt mekomsolutions/bahmni:cambodia-release-0.90\n"
          )
      );
    });

    it("should generate Docker Start Instance data script", () => {
      var mockUtils = {};
      mockUtils.random = function() {
        return "0.7p3z2u8fbvi76n32bg";
      };
      var mockedFolder = "/tmp/n32bg/";
      var dockerContainer = proxyquire(
        path.resolve("src/pipeline3/impl/dockerMonolith"),
        { "../../utils/utils": mockUtils }
      );

      expect(dockerContainer.startInstance.getDataScript(instanceDef)).toEqual(
        "" +
          scripts.remote(
            instanceDef.deployment.host.value,
            dockerContainer.exec(instanceDef, "mkdir -p " + mockedFolder) +
              "\n" +
              "docker cp /var/reference-data/demo-data.sql f95cb053-cf6e-4fd6-a531-e9cf7bfabb45:" +
              mockedFolder +
              "\n"
          ) +
          scripts.remote(
            instanceDef.deployment.host.value,
            dockerContainer.exec(
              instanceDef,
              "until ncat -w30 localhost 3306 --send-only </dev/null; do echo 'Waiting for database connection...'; sleep 5; done\n" +
                "sleep 30s; service openmrs stop\n" +
                "cat " +
                mockedFolder +
                "demo-data.sql | mysql -uroot -ppassword openmrs"
            )
          )
      );
    });

    it("should generate Docker Start Instance artifacts script", () => {
      expect(
        dockerContainer.startInstance.getArtifactsScript(instanceDef)
      ).toEqual("");
    });
  });
});
