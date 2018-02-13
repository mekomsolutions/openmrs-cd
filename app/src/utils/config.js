"use strict";

/**
 * Configuration API, typically to specify files or dirs locations.
 */

module.exports = {
  getTempDirPath: function() {
    return "/tmp";
  },
  getCommitMetadataFilePath: function() {
    return "/tmp/metadata.json";
  },
  getWebhookTriggersFilePath: function() {
    return "/usr/share/jenkins/webhook_triggers.json";
  }
};
