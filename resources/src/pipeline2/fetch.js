/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

var descriptorService = require(__dirname +'/descriptorService')
var servers = {}

try {
  servers = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
} catch (err) {
  console.log("[ERROR] No list of existing servers could be fetched.")
  console.log(err)
}

descriptorService.fetchRemoteDistroDescriptors(servers, function (errors, result) {
  if (errors.length != 0) {
    console.log("Errors have been encountered while downlading descriptors.")
    console.log("One or more server(s) may have an invalid descriptor URL.")
    console.dir(errors)
    process.exit(1); 
  }
  var descriptors = result

  console.log(descriptors)
  fs.writeFileSync('/tmp/descriptors.json', JSON.stringify(descriptors))

})
