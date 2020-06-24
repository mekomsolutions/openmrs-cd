"use strict";

describe("The instances config validator", function() {
  // deps
  const path = require("path");

  // setup
  const fileInTest = path.resolve("src/instance-event/validator.js");

  it("should validate base instances definition.", function() {
    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateBaseConfig({ uuid: "cAcb5448", type: "staging" }, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig({ name: "foo-instance", type: "dev" }, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig(
        { uuid: "cAcb5448", name: "foo-instance", type: "dev" },
        false
      );
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig(
        { name: "foo-instance", type: "dev", version: "1.0.0" },
        true
      );
    }).not.toThrow();
    expect(function() {
      _script_.validateBaseConfig({ uuid: "cAcb5448" }, true);
    }).toThrow();
    expect(function() {
      _script_.validateBaseConfig({ type: "dev" }, true);
    }).toThrow();
    expect(function() {
      _script_.validateBaseConfig({ version: "_0.9999.abs_" }, true);
    }).toThrow();
  });

  it("should validate instances deployment section.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(function() {
      _script_.validateDeploymentConfig(null, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(null, true);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(undefined, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(undefined, true);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({}, false);
    }).not.toThrow();
    expect(function() {
      _script_.validateDeploymentConfig({}, true);
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: ""
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "foobar"
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "",
          value: new model.DockerMonolithDeployment()
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: { not_a: "dir path" },
          value: new model.DockerMonolithDeployment()
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "/tmp/{{uuid}}",
          value: new model.DockerMonolithDeployment()
        },
        true
      );
    }).not.toThrow();

    // Verfiy the File TLS deployment section
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "/tmp/{{uuid}}",
          value: new model.DockerMonolithDeployment(),
          tls: {
            type: "file",
            value: { "1": "not a valid field" }
          }
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "/tmp/{{uuid}}",
          value: new model.DockerMonolithDeployment(),
          tls: {
            type: "file",
            value: new model.FileTLSDeployment()
          }
        },
        true
      );
    }).not.toThrow();

    // Verfiy the Vault TLS deployment section
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "/tmp/{{uuid}}",
          value: new model.DockerMonolithDeployment(),
          tls: {
            type: "vault",
            value: { "1": "not a valid field" }
          }
        },
        true
      );
    }).toThrow();
    expect(function() {
      _script_.validateDeploymentConfig(
        {
          type: "docker",
          hostDir: "/tmp/{{uuid}}",
          value: new model.DockerMonolithDeployment(),
          tls: {
            type: "vault",
            value: new model.VaultTLSDeployment()
          }
        },
        true
      );
    }).not.toThrow();
  });

  it("should validate an instances artifacts section.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(_script_.validateArtifactsConfig(null)).toBeTruthy();
    expect(_script_.validateArtifactsConfig(undefined)).toBeTruthy();
    expect(_script_.validateArtifactsConfig({})).toBeTruthy();

    expect(function() {
      _script_.validateInstanceDefinition({});
    }).toThrow();

    expect(function() {
      _script_.validateArtifactsConfig({
        type: ""
      });
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig([
        {
          type: ""
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig([
        {
          type: "foobar"
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig([
        {
          type: "maven"
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateArtifactsConfig([
        {
          type: "maven",
          value: new model.MavenProject()
        }
      ]);
    }).not.toThrow();
  });

  it("should validate an instances data section.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(_script_.validateDataConfig(null)).toBeTruthy();
    expect(_script_.validateDataConfig(undefined)).toBeTruthy();
    expect(_script_.validateDataConfig({})).toBeTruthy();

    expect(function() {
      _script_.validateDataConfig([
        {
          type: ""
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateDataConfig([
        {
          type: "foobar"
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateDataConfig([
        {
          type: "instance"
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateDataConfig([
        {
          type: "instance",
          value: new model.InstanceData(null, "/tmp/123")
        }
      ]);
    }).not.toThrow();
    expect(function() {
      _script_.validateDataConfig([
        {
          type: "instance",
          value: new model.InstanceData("1234-6533", null)
        }
      ]);
    }).not.toThrow();
    expect(function() {
      _script_.validateDataConfig([
        {
          type: "instance",
          value: new model.InstanceData("1234-6533", "/tmp/123")
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validateDataConfig([
        {
          type: "sql",
          value: new model.SqlData()
        }
      ]);
    }).not.toThrow();
  });

  it("should validate an instances properties section.", function() {
    // deps
    const model = require(path.resolve("src/utils/model"));

    // setup
    var _script_ = require(fileInTest);

    // verif
    expect(_script_.validatePropertiesConfig(null)).toBeTruthy();
    expect(_script_.validatePropertiesConfig(undefined)).toBeTruthy();
    expect(_script_.validatePropertiesConfig({})).toBeTruthy();
    expect(function() {
      _script_.validatePropertiesConfig("not an array");
    }).toThrow();

    expect(function() {
      _script_.validatePropertiesConfig([
        {
          filename: ""
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validatePropertiesConfig([
        {
          location: "instance"
        }
      ]);
    }).toThrow();
    expect(function() {
      _script_.validatePropertiesConfig([
        {
          filename: "erp.propeties",
          path: "/a/path",
          properties: "",
          service: ""
        }
      ]);
    }).not.toThrow();
  });
});
