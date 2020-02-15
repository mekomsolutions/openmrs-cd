"use strict";

/**
 * @param {string}
 */

const path = require("path");
const _ = require("lodash");
const log = require("npmlog");

const model = require("../utils/model");
const cst = require("../const");
const config = require(cst.CONFIGPATH);

const NEW_FLAG_MISSING_MSG =
  "There is no flag indicating whether the instance definition is new or not.";

module.exports = {
  validateInstanceDefinition: function(instanceDef, isNew) {
    module.exports.validateBaseConfig(instanceDef, isNew);

    module.exports.validateDeploymentConfig(instanceDef.deployment, isNew);

    module.exports.validateArtifactsConfig(instanceDef.artifacts, isNew);

    module.exports.validateDataConfig(instanceDef.data, isNew);

    module.exports.validatePropertiesConfig(instanceDef.properties, isNew);
  },

  validateBaseConfig: function(instanceDef, isNew) {
    if (_.isUndefined(isNew)) {
      throw new Error(NEW_FLAG_MISSING_MSG);
    }

    if (
      isNew &&
      config.getInstanceVersions().indexOf(instanceDef.version) < 0
    ) {
      throw new Error(
        "A new instance definition must point to a supported implementation version."
      );
    }
    if (isNew && instanceDef.uuid) {
      throw new Error(
        "A new instance definition cannot be provided with an UUID."
      );
    }
    if (isNew && !instanceDef.name) {
      throw new Error(
        "A new instance definition must be provided with a unique name."
      );
    }
    if (!instanceDef.uuid && !instanceDef.name) {
      throw new Error(
        "At least a name or a UUID is required to identify an instance."
      );
    }
    if (isNew && config.getInstanceTypes().indexOf(instanceDef.type) < 0) {
      throw new Error(
        "The instance type is either not recognized or not supported: '" +
          instanceDef.type +
          "'"
      );
    }
  },

  validateDeploymentConfig: function(deployment, isNew) {
    if (_.isUndefined(isNew)) {
      throw new Error(NEW_FLAG_MISSING_MSG);
    }

    var empty =
      _.isEmpty(deployment) || !deployment.type || _.isEmpty(deployment.value);
    if (isNew && empty) {
      throw new Error(
        "The deployment section did not contain enough information to proceed further with the instance, aborting."
      );
    }

    if (
      !empty &&
      config.getInstanceDeploymentTypes().indexOf(deployment.type) < 0
    ) {
      throw new Error(
        "The instance deployment type is either not recognized or not supported: '" +
          deployment.type +
          "'"
      );
    }
    if (!empty) {
      if (!deployment.hasOwnProperty("hostDir")) {
        throw new Error("The 'host dir' is not specified.");
      } else if (!_.isString(deployment.hostDir)) {
        throw new Error(
          "The 'host dir' does not point to a valid path: '" +
            deployment.hostDir +
            "'"
        );
      } else if (deployment.hostDir === "") {
        throw new Error("The 'host dir' is not specified.");
      }

      // validating the actual config based on its type
      module.exports
        .getConfigValidatorsMap()
        [deployment.type](deployment.value);
    }
    if (!empty) {
      if (deployment.hasOwnProperty("tls")) {
        var tls = deployment.tls;
        module.exports.getConfigValidatorsMap()[tls.type](tls.value);
      }
    }
  },

  validateArtifactsConfig: function(artifacts, isNew) {
    if (_.isEmpty(artifacts)) {
      return true;
    }

    if (!_.isArray(artifacts)) {
      throw new Error(
        "The artifacts section did not contain enough information to proceed further with the instance, aborting."
      );
    }

    var allArtifactsEmpty = true;
    artifacts.forEach(function(artifact) {
      allArtifactsEmpty &= validateArtifactSection(artifact, isNew);
    });

    if (isNew && allArtifactsEmpty) {
      throw new Error(
        "No artifacts were provided preventing to proceed further with the instance, aborting."
      );
    }

    function validateArtifactSection(artifact) {
      if (_.isEmpty(artifact)) {
        return true;
      }
      if (!artifact.type || _.isEmpty(artifact.value)) {
        log.error("", "Illegal argument: the artifact section is malformed.");
        throw new Error();
      }

      if (config.getInstanceArtifactsTypes().indexOf(artifact.type) < 0) {
        throw new Error(
          "The artifact type is either not recognized or not supported: '" +
            artifact.type +
            "'"
        );
      }

      module.exports.getConfigValidatorsMap()[artifact.type](artifact.value);

      return false;
    }
  },

  validateMavenArtifactConfigValue: function(value) {
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(Object.keys(new model.MavenProject()).sort())
    ) {
      throw new Error(
        "The Maven artifacts value should be provided as an instance of 'MavenProject'."
      );
    }
  },

  validateDockerDeploymentConfigValue: function(value) {
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(Object.keys(new model.DockerDeployment()).sort())
    ) {
      throw new Error(
        "The Docker deployment value should be provided as an instance of 'DockerDeployment'."
      );
    }
  },

  validateDockerComposeDeploymentConfigValue: function(value) {
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(Object.keys(new model.DockerComposeDeployment()).sort())
    ) {
      throw new Error(
        "The DockerCompose deployment value should be provided as an instance of 'DockerComposeDeployment'."
      );
    }
  },

  validateFileTLSDeploymentConfigValue: function(value) {
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(Object.keys(new model.FileTLSDeployment()).sort())
    ) {
      throw new Error(
        "The File TLS deployment value should be provided as an instance of 'FileTLSDeployment'."
      );
    }
  },

  validateVaultTLSDeploymentConfigValue: function(value) {
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(Object.keys(new model.VaultTLSDeployment()).sort())
    ) {
      throw new Error(
        "The Vault TLS deployment value should be provided as an instance of 'VaultTLSDeployment'."
      );
    }
  },

  validateDataConfig: function(data) {
    if (_.isEmpty(data)) {
      return true;
    }
    data.forEach(function(element) {
      if (_.isEmpty(element)) {
        log.error("", "Illegal argument: the data section is malformed.");
        throw new Error();
      }
      if (element.type === "instance") {
        var empty =
          _.isEmpty(element.value) ||
          (_.isEmpty(element.value.uuid) && _.isEmpty(element.value.dataDir));
        if (empty) {
          throw new Error(
            "The data.type 'instance' section did not contain enough information to proceed further with the instance, aborting."
          );
          return true;
        }
        var invalid =
          !_.isEmpty(element.value.uuid) && !_.isEmpty(element.value.dataDir);
        if (invalid) {
          throw new Error(
            "The data.type 'instance' value section cannot contain both 'uuid' and 'dataDir' fields, aborting."
          );
        }
      } else if (element.type === "sql") {
        if (
          JSON.stringify(Object.keys(element.value).sort()) !==
          JSON.stringify(Object.keys(new model.SqlData()).sort())
        ) {
          throw new Error(
            "The data.type 'sql' section did not contain enough information to proceed further with the instance, aborting."
          );
        }
      } else {
        log.error("", "Illegal argument: the data section is malformed.");
        throw new Error();
      }
    });
  },

  validatePropertiesConfig: function(properties, isNew) {
    if (_.isEmpty(properties)) {
      return true;
    }

    if (!_.isArray(properties)) {
      throw new Error(
        "The properties section of the instance must be of type Array, aborting."
      );
    }
    var allPropertiesEmpty = true;
    properties.forEach(function(property) {
      allPropertiesEmpty &= validatePropertySection(property, isNew);
    });

    function validatePropertySection(property) {
      if (_.isEmpty(property)) {
        return true;
      }
      return false;
    }
    properties.forEach(function(property) {
      if (
        JSON.stringify(Object.keys(property).sort()) !==
        JSON.stringify(Object.keys(new model.Property()).sort())
      ) {
        throw new Error(
          "The Property should be provided as an instance of 'Property'."
        );
      }
    });
  },

  getConfigValidatorsMap: function() {
    return {
      maven: module.exports.validateMavenArtifactConfigValue,
      docker: module.exports.validateDockerDeploymentConfigValue,
      dockerCompose: module.exports.validateDockerComposeDeploymentConfigValue,
      file: module.exports.validateFileTLSDeploymentConfigValue,
      vault: module.exports.validateVaultTLSDeploymentConfigValue
    };
  }
};
