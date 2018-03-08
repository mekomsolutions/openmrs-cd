"use strict";

/**
 * @param {string}
 */

const config = require("../utils/config");
const model = require("../models/model");
const _ = require("lodash");

module.exports = {
  isNewInstance: function(status) {
    return _.isEmpty(status);
  },

  validateDeploymentConfig: function(deployment) {
    if (_.isEmpty(deployment) || !deployment.type) {
      throw new Error(
        "The deployment section did not contain enough information to proceed further with the instance, aborting."
      );
    }

    if (config.getInstanceDeploymentTypes().indexOf(deployment.type) < 0) {
      throw new Error(
        "The instance deployment type is either not recognized or not supported: '" +
          deployment.type +
          "'"
      );
    }
  },

  validateArtifactsConfig: function(artifacts) {
    if (_.isEmpty(artifacts) || !artifacts.type || _.isEmpty(artifacts.value)) {
      throw new Error(
        "The artifacts section did not contain enough information to proceed further with the instance, aborting."
      );
    }

    if (config.getInstanceArtifactsTypes().indexOf(artifacts.type) < 0) {
      throw new Error(
        "The instance artifacts type is either not recognized or not supported: '" +
          artifacts.type +
          "'"
      );
    }

    module.exports.validateConfigValue()[artifacts.type](artifacts.value);
  },

  validateMavenArtifactsConfigValue: function(value) {
    if (
      JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(Object.keys(new model.MavenProject()).sort())
    ) {
      throw new Error(
        "The Maven artifacts value should be provided as an instance of " +
          model.MavenProject
      );
    }
  },

  validateDockerDeploymentConfigValue: function(value) {},

  validateConfigValue: function() {
    return {
      maven: module.exports.validateMavenArtifactsConfigValue,
      docker: module.exports.validateDockerDeploymentConfigValue
    };
  }
};
