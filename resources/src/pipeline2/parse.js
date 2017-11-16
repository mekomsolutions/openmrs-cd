/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

var descriptorsDir = "/tmp"
var descriptors = JSON.parse(fs.readFileSync(descriptorsDir + '/descriptors.json'))

var dependenciesByServer = {}

descriptors.forEach(function(item) {

  var descriptor = require('./impl/' + item.type).getInstance(item.id, item.descriptor)
  dependenciesByServer[item.id] = descriptor.getDependencies()

});

var byArtifact = utils.sortByArtifact(dependenciesByServer)
console.log(byArtifact)
fs.writeFileSync('/tmp/dependencies.json', JSON.stringify(byArtifact))
