"use strict";

/**
 * @param {string}
 */

const log = require("npmlog");
const _ = require("lodash");

const config = require("../utils/config");
const model = require("../models/model");

const NEW_FLAG_MISSING_MSG =
  "There is no flag indicating whether the instance definition is new or not.";

module.exports = {
  validateInstanceDefinition: function(instanceDef, isNew) {
    module.exports.validateBaseConfig(instanceDef, isNew);
    module.exports.validateDeploymentConfig(instanceDef.deployment, isNew);
    module.exports.validateArtifactsConfig(instanceDef.artifacts, isNew);
  },

  validateBaseConfig: function(instanceDef, isNew) {
    if (_.isUndefined(isNew)) {
      throw new Error(NEW_FLAG_MISSING_MSG);
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
    if (config.getInstanceTypes().indexOf(instanceDef.type) < 0) {
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
      // validating the actual config based on its type
      module.exports
        .getConfigValidatorsMap()
        [deployment.type](deployment.value);
    }
  },

  validateArtifactsConfig: function(artifacts, isNew) {
    if (_.isUndefined(isNew)) {
      throw new Error(NEW_FLAG_MISSING_MSG);
    }

    var empty =
      _.isEmpty(artifacts) || !artifacts.type || _.isEmpty(artifacts.value);
    if (isNew && empty) {
      throw new Error(
        "The artifacts section did not contain enough information to proceed further with the instance, aborting."
      );
    }

    if (
      !empty &&
      config.getInstanceArtifactsTypes().indexOf(artifacts.type) < 0
    ) {
      throw new Error(
        "The instance artifacts type is either not recognized or not supported: '" +
          artifacts.type +
          "'"
      );
    }

    if (!empty) {
      // validating the actual config based on its type
      module.exports.getConfigValidatorsMap()[artifacts.type](artifacts.value);
    }
  },

  validateMavenArtifactsConfigValue: function(value) {
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
    log.warn(
      "",
      "The Docker config deployment value validator is not yet implemented."
    );
  },

  getConfigValidatorsMap: function() {
    return {
      maven: module.exports.validateMavenArtifactsConfigValue,
      docker: module.exports.validateDockerDeploymentConfigValue
    };
  }
};
