/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */
var model = require("../model");

module.exports = {
  /**
   * Parses a GitHub payload to return a @see{CommitMetadata} object
   *
   * @return the @see{CommitMetadata} object's
   *    - repoUrl
   *    - repoName
   *    - branchName
   *    - commitId
   */
  parsePayload: function(payload) {
    // If no payload was received there is nothing to do. Not allowed to use "null".
    if (payload === "") {
      return 0;
    }

    var payloadObject = JSON.parse(payload);

    var metadata = new model.CommitMetadata();

    metadata.repoUrl = payloadObject.repository.html_url;
    metadata.repoName = payloadObject.repository.name;

    if (payloadObject.ref != null) {
      var refPath = payloadObject.ref.split("/");
      metadata.branchName = refPath[refPath.length - 1];
    } else {
      process.exit(0);
    }

    if (payloadObject.head_commit != null) {
      metadata.commitId = payloadObject.head_commit.id.slice(0, 7);
    } else {
      process.exit(0);
    }

    return metadata;
  }
};
