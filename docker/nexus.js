var fs  = require('fs');
var swig  = require('swig');
var prompt = require('prompt');

var template = swig.compileFile('/usr/share/jenkins/ref/m2.settings.xml.j2');
var outputDir = "/var/jenkins_home/.m2/"

console.log("Fetching MKS Nexus server credentials...")
var schema = {
  properties: {
    username: {
      message: 'Nexus username',
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

  console.log("Saved in "+ outputDir + "settings.xml")
  fs.writeFileSync(outputDir + "settings.xml", output)
});
