/**
* @author Romain Buisson (romain@mekomsolutions.com)
*
*/
var fs = require('fs');
var utils = require('../utils/utils')

var dependenciesDir = "/tmp"
var historyDir = "/var/jenkins_home"
var dependencies = JSON.parse(fs.readFileSync(dependenciesDir + '/dependencies.json'))

try {
  var artifact = JSON.parse(fs.readFileSync(dependenciesDir + '/artifact.json'))
} catch (err) {
  console.log("[ERROR] Unable to retrieve the 'artifact.json' file. This file is supposed to be created by upstream job(s) to describe the current artifact being built")
  console.log("Please run the needed upstream job(s) first")
  console.log(err)
  process.exit(1)
}

var history = {}
try {
  history = JSON.parse(fs.readFileSync(historyDir + '/history.json'))
} catch (err) {
  console.log("[WARN] No history file found or unable to retrieve it. This may not be an error if you are running this for the first time")
  console.log(err)
}

// 'history' is passed by reference so it will be updated in the function
utils.setMatchingServersAndUpdateHistory(artifact, dependencies, history)

fs.writeFileSync(historyDir + '/history.json', JSON.stringify(history))
console.log(JSON.stringify(history, null, 4))