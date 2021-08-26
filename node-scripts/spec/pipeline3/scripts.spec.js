"use strict";

describe("Scripts", function() {
  // deps
  const fs = require("fs");
  const path = require("path");
  const proxyquire = require("proxyquire");

  const config = require(path.resolve("src/utils/config"));
  const utils = require(path.resolve("src/utils/utils"));
  const cst = require(path.resolve("src/const"));
  const dockerContainer = require(path.resolve("src/pipeline3/impl/docker"));
  const heredoc = cst.HEREDOC;

  const scripts = require(path.resolve(
    "src/" + config.getJobNameForPipeline3() + "/scripts"
  ));

  it("should generate remote commands.", function() {
    // setup
    var ssh = {
      user: "user",
      ip: "host",
      port: "22"
    };

    // verif
    expect(scripts.remote(ssh, "echo test")).toEqual(
      "ssh -T " +
        ssh.user +
        "@" +
        ssh.ip +
        " -p " +
        ssh.port +
        " /bin/bash" +
        " --login <<" +
        heredoc +
        "\n" +
        "echo test\n" +
        heredoc +
        "\n"
    );
  });

  it("should add or remove trailing slashes to directory paths.", function() {
    expect(scripts.trailSlash("foo", true)).toEqual("foo/");
    expect(scripts.trailSlash("foo/", true)).toEqual("foo/");
    expect(scripts.trailSlash("foo/")).toEqual("foo/");
    expect(scripts.trailSlash("foo", false)).toEqual("foo");
    expect(scripts.trailSlash("foo/", false)).toEqual("foo");
    expect(scripts.trailSlash("foo", undefined)).toEqual("foo");
    expect(scripts.trailSlash("foo/", undefined)).toEqual("foo/");
    expect(scripts.trailSlash("foo", null)).toEqual("foo");
    expect(scripts.trailSlash("foo/", null)).toEqual("foo/");

    expect(function() {
      scripts.trailSlash("foo/", {});
    }).toThrow();
    expect(function() {
      scripts.trailSlash("foo/", { foo: "bar" });
    }).toThrow();
    expect(function() {
      scripts.trailSlash("foo/", "bar");
    }).toThrow();
  });

  it("should generate rsync commands.", function() {
    // setup
    var ssh = {
      user: "user",
      ip: "host",
      port: "22"
    };

    // verif
    expect(scripts.rsync(null, "/src", "/dst")).toEqual(
      "rsync -avzz /src /dst\n"
    );
    expect(scripts.rsync(null, "/src", "/dst", true, true)).toEqual(
      "rsync -avzz /src/ /dst/\n"
    );
    expect(scripts.rsync(null, "/src", "/dst", null, null, "-xyz")).toEqual(
      "rsync -xyz /src /dst\n"
    );

    expect(scripts.rsync(ssh, "/src", "/dst")).toEqual(
      "rsync -avzz /src /dst\n"
    );
    Object.assign(ssh, { remoteDst: true });
    expect(scripts.rsync(ssh, "/src", "/dst")).toEqual(
      "rsync -avzz -e 'ssh -p 22' /src user@host:/dst\n"
    );
    delete ssh.remoteDst;
    Object.assign(ssh, { remoteSrc: true });
    expect(scripts.rsync(ssh, "/src", "/dst")).toEqual(
      "rsync -avzz -e 'ssh -p 22' user@host:/src /dst\n"
    );
  });

  it("should linkFolder", function() {
    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
      return "0.123456789";
    };

    var scripts_ = proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline3() + "/scripts.js"),
      { "../utils/utils": mockUtils }
    );

    var expectedScript = scripts_.linkFolder(
      "source123",
      "target123",
      "bahmni",
      "bahmni",
      true
    );

    expect(expectedScript).toContain("rsync -avzz target123/ target123.backup");
    expect(expectedScript).toContain("mkdir -p source123");
    expect(expectedScript).toContain("rsync -avzz target123/ source123");
    expect(expectedScript).toContain("rm -rf target123");
    expect(expectedScript).toContain("ln -s source123 target123");
    expect(expectedScript).toContain("chown -R bahmni:bahmni source123");
  });

  it("should set timezone", function() {
    expect(scripts.setTimezone("Europe/Paris")).toContain(
      "mv /etc/localtime /etc/localtime.backup\n" +
        "ln -s /usr/share/zoneinfo/Europe/Paris /etc/localtime"
    );
  });

  it("should linkComponents", function() {
    var mockUtils = Object.assign({}, utils);
    mockUtils.random = function() {
      return "0.123456789";
    };

    var scripts_ = proxyquire(
      path.resolve("src/" + config.getJobNameForPipeline3() + "/scripts.js"),
      { "../utils/utils": mockUtils }
    );

    var links = [
      {
        type: "artifact",
        component: "bahmniconnect",
        source: "/mnt/artifacts/bahmni_emr/bahmniconnect/bahmni-connect-apps",
        target: "/opt/bahmni-offline/bahmni-connect-apps",
        user: "bahmni",
        group: "bahmni"
      },
      {
        type: "data",
        component: "db_dumps",
        source: "/mnt/data/db_dumps",
        target: "/data",
        user: "mysql",
        group: "mysql"
      }
    ];

    var artifactsLinks = "";
    artifactsLinks += scripts_.linkFolder(
      links[0].source,
      links[0].target,
      links[0].user,
      links[0].group,
      true
    );
    var dataLinks = "";
    dataLinks += scripts_.linkFolder(
      links[1].source,
      links[1].target,
      links[1].user,
      links[1].group,
      true
    );

    var actualScript = scripts_.linkComponents(links);
    expect(actualScript).toContain(artifactsLinks);
    expect(actualScript).toContain(dataLinks);
  });

  it("should compute additional instance's scripts", function() {
    var instanceDef = {
      uuid: "1-22-333",
      scripts: [
        {
          type: "shell",
          executionStage: "6",
          conditions: ["data"],
          value: "/a/script.sh"
        }
      ],
      deployment: {
        host: {
          type: "ssh",
          value: {
            ip: "54.154.133.95",
            user: "ec2-user",
            port: "22"
          }
        },
        type: "docker"
      }
    };

    process.env[config.varDataChanges()] = "true";
    process.env[config.varArtifactsChanges()] = "true";
    process.env[config.varDeploymentChanges()] = "true";

    var scriptsToRun = [];
    var script = [];
    script.push("some commands");
    var currentStage = "6";

    scriptsToRun = scripts.computeAdditionalScripts(
      script,
      instanceDef,
      currentStage,
      config,
      process.env
    );
    expect(scriptsToRun.script).toEqual([
      "some commands",
      scripts.remote(
        instanceDef.deployment.host.value,
        dockerContainer.exec(instanceDef, instanceDef.scripts[0].value)
      )
    ]);

    script = [];
    script.push("some commands");
    // Setting a different 'currentStage'
    currentStage = "7";

    scriptsToRun = scripts.computeAdditionalScripts(
      script,
      instanceDef,
      currentStage,
      config,
      process.env
    );
    expect(scriptsToRun.script).toEqual(["some commands"]);

    // Sets 'atStageStart' to true
    instanceDef.scripts[0].atStageStart = "true";
    script = [];
    script.push("some commands");
    currentStage = "6";

    scriptsToRun = scripts.computeAdditionalScripts(
      script,
      instanceDef,
      currentStage,
      config,
      process.env
    );

    // Expects the 'scriptsToRun' to be placed first in the whole script
    expect(scriptsToRun.script).toEqual([
      scripts.remote(
        instanceDef.deployment.host.value,
        dockerContainer.exec(instanceDef, instanceDef.scripts[0].value)
      ),
      "some commands"
    ]);

    // Set a 'false' data changes
    process.env[config.varDataChanges()] = "false";
    process.env[config.varArtifactsChanges()] = "true";
    process.env[config.varDeploymentChanges()] = "true";

    script = [];
    script.push("some commands");
    currentStage = "6";

    scriptsToRun = scripts.computeAdditionalScripts(
      script,
      instanceDef,
      currentStage,
      config,
      process.env
    );
    expect(scriptsToRun.script).toEqual(["some commands"]);

    script = [];
    script.push("some commands");
    instanceDef.scripts.push({
      type: "shell",
      executionStage: "6",
      conditions: ["artifacts"],
      restart: "true",
      value: "/b/script.sh"
    });

    scriptsToRun = scripts.computeAdditionalScripts(
      script,
      instanceDef,
      currentStage,
      config,
      process.env
    );

    expect(scriptsToRun.script).toEqual([
      "some commands",
      scripts.remote(
        instanceDef.deployment.host.value,
        dockerContainer.exec(instanceDef, "/b/script.sh")
      )
    ]);
    expect(scriptsToRun.restartNeeded).toBeTruthy();
  });
  it("should generate Bahmni restore commands", function() {
    var sql = {
      engine: "bahmni",
      database: "openmrs",
      sourceFile: "/var/reference-data/demo-data.sql",
      user: "root",
      password: "password"
    };
    expect(scripts.bahmniRestore("/a/path", "b.sql", sql)).toContain(
      "mv /a/path/b.sql /data/openmrs/b.sql\n" +
        "bahmni -i local restore --restore_type=db --options=openmrs --strategy=dump --restore_point=b.sql"
    );
  });
  it("should generate MySQL restore commands", function() {
    var sql = {
      engine: "mysql",
      database: "openmrs",
      sourceFile: "/var/reference-data/demo-data.sql",
      user: "root",
      password: "password"
    };
    var waitForMySQL =
      "until ncat -w30 localhost 3306 --send-only </dev/null; do echo 'Waiting for database connection...'; sleep 5; done";
    var stopService = "sleep 30s; service openmrs stop";
    var sqlCmd = "cat /a/path/b.sql | mysql -uroot -ppassword openmrs";

    expect(scripts.mySqlRestore("/a/path", "b.sql", sql)).toContain(
      waitForMySQL + "\n" + stopService + "\n" + sqlCmd
    );
  });
  it("should generate dockerApacheMacro commands", function() {
    var proxy = {
      containerName: "proxy_macro",
      confFolder: "/etc/httpd/conf.d",
      macroName: "Macro",
      port: "8900",
      targetUrl: "http://cd05.mks.net:8920"
    };
    var createProxy = scripts.dockerApacheMacro.createProxy(
      proxy,
      "http://maintenance.mks.net:8950",
      "true"
    );

    expect(createProxy).toContain(
      "echo -e 'Use Macro 8900 http://cd05.mks.net:8920 http://maintenance.mks.net:8950 maintenance_off' > /etc/httpd/conf.d/use_macro/10-8900.conf\n"
    );
    expect(createProxy).toContain(scripts.dockerApacheMacro.reload(proxy));

    expect(createProxy).toContain(
      "semanage port -a -t http_port_t -p tcp 8900"
    );

    expect(
      scripts.dockerApacheMacro.createProxy(
        proxy,
        "http://maintenance.mks.net:8950",
        "false"
      )
    ).not.toContain(
      "semanage port -a -t http_port_t -p tcp 8900\n" +
        scripts.dockerApacheMacro.reload("proxy")
    );

    expect(scripts.dockerApacheMacro.reload(proxy)).toContain(
      "apachectl graceful"
    );

    expect(scripts.dockerApacheMacro.maintenance(true, proxy)).toContain(
      "sed -i 's/maintenance_off/maintenance_on/g' /etc/httpd/conf.d/use_macro/10-8900.conf\n" +
        scripts.dockerApacheMacro.reload(proxy)
    );
    expect(scripts.dockerApacheMacro.maintenance(false, proxy)).toContain(
      "sed -i 's/maintenance_on/maintenance_off/g' /etc/httpd/conf.d/use_macro/10-8900.conf\n" +
        scripts.dockerApacheMacro.reload(proxy)
    );
  });

  it("should properly create folder creation script", function() {
    var folderPath = "test_folder";
    var user = "user";
    var group = "group";

    expect(scripts.initFolder(folderPath, user)).toEqual(
      "sudo mkdir -p test_folder\n" + "sudo chown -R user:user test_folder\n\n"
    );

    expect(scripts.initFolder(folderPath, user, null, true)).toEqual(
      "sudo mkdir -p test_folder\n" +
        "sudo chown -R user:user test_folder\n" +
        "rm -rf test_folder/*" +
        "\n"
    );

    expect(scripts.initFolder(folderPath, user, group, true)).toEqual(
      "sudo mkdir -p test_folder\n" +
        "sudo chown -R user:group test_folder\n" +
        "rm -rf test_folder/*" +
        "\n"
    );
  });

  it("should generate script to set or replace environment variables", function() {
    var envVar = "KEY";
    var value = "env.value";
    var filename = ".env";

    expect(scripts.writeProperty(envVar, value, filename)).toEqual(
      'if ! grep -R "^[#]*s*KEY.*" .env > /dev/null; then\n' +
        "\techo \"'KEY' is not found in file '.env'. Appending...\"\n" +
        '\techo "KEY=env.value" >> .env\n' +
        "else\n" +
        "\techo \"'KEY' is found in file '.env'. Updating...\"\n" +
        '\tsed -i "s/^[#]*\\s*KEY\\b.*/KEY=env.value/" .env\n' +
        "fi\n"
    );
  });

  it("should generate script to create environment file", function() {
    var instanceDef = {
      name: "hsc-dev",
      uuid: "1-22-333",
      scripts: [
        {
          type: "shell",
          executionStage: "6",
          conditions: ["data"],
          value: "/a/script.sh"
        }
      ],
      deployment: {
        hostDir: "/var/docker-volumes",
        host: {
          type: "ssh",
          value: {
            ip: "54.154.133.95",
            user: "ec2-user",
            port: "22"
          }
        },
        type: "dockerCompose"
      },
      envVars: {
        prop: "value",
        prop2: "value2"
      }
    };
    expect(scripts.createEnvVarFile(instanceDef)).toEqual(
      "if [[ ! -e /var/docker-volumes/hsc-dev/hsc-dev.env ]]; then\n" +
        "    mkdir -p /var/docker-volumes/hsc-dev\n" +
        "    touch /var/docker-volumes/hsc-dev/hsc-dev.env\n" +
        "fi\n" +
        "\ncp /var/docker-volumes/hsc-dev/bahmni_docker/.env /var/docker-volumes/hsc-dev/hsc-dev.env\n" +
        scripts.writeProperty(
          "prop",
          "value",
          "/var/docker-volumes/hsc-dev/hsc-dev.env"
        ) +
        scripts.writeProperty(
          "prop2",
          "value2",
          "/var/docker-volumes/hsc-dev/hsc-dev.env"
        )
    );
  });

  it("should generate script to clone a Git repo", function() {
    var gitUrl = "git@github:mekomsolutions/bahmni-docker.git";
    var commitId = "12b9a94";
    var distroPath = "/path/to/distro";

    expect(scripts.gitClone(gitUrl, distroPath, commitId)).toEqual(
      'if [ "$(ls -A ' +
        distroPath +
        ')" ]; then\n' +
        "     rm -rf " +
        distroPath +
        "\nfi\n" +
        "git clone " +
        gitUrl +
        " " +
        distroPath +
        "\n" +
        "cd " +
        distroPath +
        " && git checkout " +
        commitId +
        "\n"
    );
  });

  it("should generate fetchArtifact() commands", function() {
    var actual = scripts.fetchArtifact(
      {
        groupId: "net.mekomsolutions",
        artifactId: "openmrs-distro-cambodia",
        version: "1.1.0-SNAPSHOT",
        packaging: "zip"
      },
      "maven",
      "a_path"
    );

    var expected =
      "mvn org.apache.maven.plugins:maven-dependency-plugin:3.2.0:get -DremoteRepositories= https://nexus.mekomsolutions.net/repository/maven-public -Dartifact=net.mekomsolutions:openmrs-distro-cambodia:1.1.0-SNAPSHOT:zip -Dtransitive=false" +
      "\nmvn org.apache.maven.plugins:maven-dependency-plugin:3.2.0:copy -Dartifact=net.mekomsolutions:openmrs-distro-cambodia:1.1.0-SNAPSHOT:zip -DoutputDirectory=a_path" +
      "\nunzip a_path/openmrs-distro-cambodia-1.1.0-SNAPSHOT.zip -d a_path/" +
      "\nrm a_path/openmrs-distro-cambodia-1.1.0-SNAPSHOT.zip" +
      "\n";

    expect(actual).toEqual(expected);
  });
});
