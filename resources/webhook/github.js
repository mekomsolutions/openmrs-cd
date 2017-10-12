/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/

var model = require('./model')

module.exports = {

  /**
  * Parses a GitHub payload to return a @see{WebhookMetadata} object
  *
  * @return the @see{WebhookMetadata} object 
  */
  parsePayload: function (payload) {

  // If no payload was received there is nothing to do. Not allowed to use "null".
    if (payload === "") {
      return 0;
    }

    var payloadObject = JSON.parse(payload);

    var parsedData = new model.WebhookMetadata();

    parsedData.url = payloadObject.repository.html_url
    parsedData.repo = payloadObject.repository.name;

    if (payloadObject.ref != null) {
      var refPath = payloadObject.ref.split("/");
      parsedData.branch = refPath[refPath.length - 1];
    } else {
      process.exit(0);
    }

    if (payloadObject.head_commit != null) {
      parsedData.commit = payloadObject.head_commit.id.slice(0, 7);
    } else {
      process.exit(0);
    }

    return parsedData
  }
}