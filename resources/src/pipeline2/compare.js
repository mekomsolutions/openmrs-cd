/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

var dependenciesDir = "/tmp"
var dependencies = JSON.parse(fs.readFileSync(dependenciesDir + '/dependencies.json'))

artifact = process.env.artifact