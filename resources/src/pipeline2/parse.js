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
fs.writeFileSync('/tmp/dependenciesByServer.json', JSON.stringify(dependenciesByServer))

fs.writeFileSync('/tmp/dependencies.json', JSON.stringify(utils.sortByArtifact(dependenciesByServer)))
