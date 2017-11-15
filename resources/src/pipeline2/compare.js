/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

var dependenciesDir = "/tmp"
var dependencies = JSON.parse(fs.readFileSync(dependenciesDir + '/dependencies.json'))
var artifact = JSON.parse(fs.readFileSync(dependenciesDir + '/artifact.json'))

var history = {}
try {
  history = JSON.parse(fs.readFileSync(dependenciesDir + '/history.json'))
} catch (err) {
  console.log("[WARN] No history file found or unable to retrieve it. This may not be an error if you are running this for the first time")
  console.log(err)
}

// 'history' is passed by reference so it will be updated in the function
utils.setMatchingServersAndUpdateHistory(artifact, dependencies, history)

fs.writeFileSync('/tmp/history.json', JSON.stringify(history))

console.log(history)