/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');

var project = require('./' + process.env.type).getInstance();

fs.writeFile(process.env.WORKSPACE + "/build.sh", project.getBuildScriptAsString() , function(err) {
  if (err) {
    return console.log(err);
  }
});

fs.chmodSync(process.env.WORKSPACE + "/build.sh", 0755);