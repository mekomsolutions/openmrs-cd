var fs  = require('fs');
var mustache = require('mustache')

var resourceDir = "/usr/share/jenkins/"
var outputDir = "/var/jenkins_home/"

var serverCredentials = function() {

  var prompt = require('prompt');

  console.log("Prompting MKS artifact repository credentials...")
  var schema = {
    properties: {
      id: {
        message: 'Repo ID',
        default: 'mks-nexus',
        required: true
      },
      username: {
        message: 'Repo username',
        default: 'jenkins',
        required: true
      },
      password: {
        message: 'Repo password',
        required: true,
        hidden: true
      }
    }
  };

  prompt.message = ""
  prompt.delimiter = ":"
  prompt.colors = false;

  prompt.start()

  prompt.get(schema, function (err, result) {
    var template = fs.readFileSync(resourceDir + 'm2_settings.xml.template', 'utf8');
    var output = mustache.render(template, {
      repo_id: result.id,
      repo_username: result.username,
      repo_password: result.password
    });

    fs.writeFileSync(outputDir + ".m2/settings.xml", output)
    console.log("Saved in "+ outputDir + ".m2/settings.xml")

    serverUrls(result.id)
  });
}

var serverUrls = function(repo_id) {

  var prompt = require('prompt');

  var defaultFileName = 'artifact_repo_default.json'

  console.log("\nConfiguring server URLs...")

  if (fs.existsSync(resourceDir + defaultFileName)) {
    prompt.message = "A file '" + defaultFileName + "' is found at '" + resourceDir + "'. "
    prompt.delimiter = ""
    var schema = {
      properties: {
        answer: {
          message: "Would you like to use it to provide the URLs and repo ID? [y/n]",
          required: true,
          default: 'y',
        }
      }
    }
    prompt.start()

    prompt.get(schema, function (err, result) {
      if (result.answer == 'y') {
        saveUrlsFiles(JSON.parse(fs.readFileSync(resourceDir + defaultFileName, 'utf8')))
        return
      }
      else {
        promptUrls(repo_id)
      }
    })
  } else {
    promptUrls(repo_id)
  }
}

var promptUrls = function (repo_id, outputDir) {

  var prompt = require('prompt');
  
  console.log("\nPrompting server URLs... (based on '" + resourceDir + "artifact_types.json')")
  
  var json = JSON.parse(fs.readFileSync(resourceDir + 'artifact_types.json', 'utf8'))

  var schema = {};
  schema.properties = {}

  var arrayLength = json.artifact_types.length;
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
    result.NEXUS_REPO_ID = repo_id
    saveUrlsFiles(result)
  });

}

var saveUrlsFiles = function (result) {

  fs.writeFileSync(outputDir + "artifact_repository.env", convertToEnvVar(result))
  fs.writeFileSync(outputDir + "artifact_repository.json", JSON.stringify(result))
  console.log("Saved in "+ outputDir + "artifact_repository.env and "+ outputDir + "artifact_repository.json")
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

serverCredentials();
