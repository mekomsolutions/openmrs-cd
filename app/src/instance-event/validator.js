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

    if (
      isNew &&
      _.isEmpty(instanceDef.artifacts || !_.isArray(instanceDef.artifacts))
    ) {
      throw new Error(
        "The artifacts section did not contain enough information to proceed further with the instance, aborting."
      );
    }
    var allArtifactsEmpty = true;
    instanceDef.artifacts.forEach(function(artifact) {
      allArtifactsEmpty &= module.exports.validateArtifactSection(
        artifact,
        isNew
      );
    });
    if (isNew && allArtifactsEmpty) {
      throw new Error(
        "No artifacts were provided preventing to proceed further with the instance, aborting."
      );
    }
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

  validateArtifactSection: function(artifact) {
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
    log.warn(
      "",
      "The Docker config deployment value validator is not yet implemented."
    );
  },

  getConfigValidatorsMap: function() {
    return {
      maven: module.exports.validateMavenArtifactConfigValue,
      docker: module.exports.validateDockerDeploymentConfigValue
    };
  }
};
