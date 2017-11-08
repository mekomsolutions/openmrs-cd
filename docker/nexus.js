var fs  = require('fs');
var swig  = require('swig');


var nexusCredentials = function() {

  var prompt = require('prompt');
  var outputDir = "/var/jenkins_home/.m2/"
  var template = swig.compileFile('/usr/share/jenkins/m2.settings.xml.j2');

  console.log("Fetching MKS Nexus server credentials...")
  var schema = {
    properties: {
      username: {
        message: 'Nexus username',
        default: 'jenkins',
        required: true
      },
      password: {
        message: 'Nexus password',
        hidden: true
      }
    }
  };

  prompt.message = ""
  prompt.delimiter = ":"
  prompt.colors = false;

  prompt.start()

  prompt.get(schema, function (err, result) {

    var output = template({
      m2_username: result.username,
      m2_password: result.password
    });

    fs.writeFileSync(outputDir + "settings.xml", output)
    console.log("Saved in "+ outputDir + "settings.xml")

    nexusUrls()
  });
}


var nexusUrls = function() {


  var prompt = require('prompt');
  var outputDir = "/var/jenkins_home/"

  console.log("Configuring Nexus URLs...")
  var json = JSON.parse(fs.readFileSync('/usr/share/jenkins/artifact_types.json', 'utf8'))
  
  var schema = {};
  schema.properties = {}

  var arrayLength = json.artifact_types.length;

  schema.properties["NEXUS_REPO_ID"] = {
    message: "Nexus repository ID",
    default: "mks-nexus"
  }
  for (var i = 0; i < arrayLength; i++) {
    schema.properties["ARTIFACT_UPLOAD_URL_" + json.artifact_types[i]] = {
      message: "'" + json.artifact_types[i] + "' artifact upload URL"
    }
  }


  prompt.message = ""
  prompt.delimiter = ":"
  prompt.colors = false;

  prompt.start()

  prompt.get(schema, function (err, result) {
    fs.writeFileSync(outputDir + "artifact_repository.env", convertToEnvVar(result))
    fs.writeFileSync(outputDir + "artifact_repository.json", JSON.stringify(result))
    console.log("Saved in "+ outputDir + "artifact_repository.env and "+ outputDir + "artifact_repository.json")
  });
}

var convertToEnvVar = function (object) {
  var envvars = ""

  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      envvars = envvars + property + "=" + object[property] + "\n";
    }
  }
  return envvars
}

nexusCredentials();
