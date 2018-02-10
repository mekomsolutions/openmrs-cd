var fs = require("fs");

describe("Tests suite for Webhook", function() {
  it("Github: should parse the payload", function() {
    var type = "github";

    var folderInTest = __dirname + "/../../src/webhook/";

    var payloadParser = new require(folderInTest + "impl/" + type);

    var metadata = payloadParser.parsePayload(
      fs.readFileSync(__dirname + "/payload_example.json", "utf8")
    );
    metadata.type = type;

    expect(metadata.branch).toBe("BAHMNI-17");
    expect(metadata.commit).toBe("ac67634");
    expect(metadata.url).toBe(
      "https://github.com/mekomsolutions/bahmni-config-cambodia"
    );
  });
});
