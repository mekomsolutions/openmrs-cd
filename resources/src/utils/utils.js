var XML = require('pixl-xml');
var fs = require('fs')

module.exports = {

  /**
  * @return Returns a concatenated string of all the properties of the passed object
  */
  convertToEnvVar: function (object) {
    var envvars = ""

    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        envvars = envvars + property + "=" + object[property] + "\n";
      }
    }
    return envvars
  },
  getPom: function (pomPath) {

    var file = fs.readFileSync(pomPath + 'pom.xml', 'utf8')
    var parsedPom = XML.parse(file)

    return parsedPom;
  },
  getScriptAsString: function (script) {

    var string = ""

    string = script.type
    string = string + "\n\n"
    string = string + script.comments
    string = string + "\n\n"
    string = string + script.value

    return string
  }
}
