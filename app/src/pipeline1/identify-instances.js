/**
 *
 */

"use strict";

const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);
const utils = require("../utils/utils");
const cmns = require("./commons");

const fs = require("fs");
const log = require("npmlog");
const _ = require("lodash");

//
//  Gathering all the artifact keys directly linked to the currently built artifact
//
var artifactsIds = cmns.getMavenArtifactIds(config.getArtifactIdListFilePath());

var artifact = JSON.parse(
  fs.readFileSync(config.getBuildArtifactJsonPath(), "utf-8")
);
var artifactKeys = [];
artifactKeys.push(
  // main POM artifact
  utils.toArtifactKey(
    artifact.mavenProject.groupId,
    artifact.mavenProject.artifactId,
    artifact.mavenProject.version
  )
);
artifactsIds.forEach(function(artifactId) {
  artifactKeys.push(
    // sub-POMs artifacts
    utils.toArtifactKey(
      artifact.mavenProject.groupId,
      artifactId,
      artifact.mavenProject.version
    )
  );
});
artifactKeys = _.uniq(artifactKeys); // the main POM artifact might be counted twice

//
//  Identifying the instances impacted by the build / artifact keys.
//
var instancesEvents = [];
var allInstances = db.getAllInstancesDefinitions();
allInstances.forEach(function(instance) {
  instance.artifacts.forEach(function(artifact) {
    if (artifact.type === "maven") {
      var instanceArtifactKey = utils.toArtifactKey(
        artifact.value.groupId,
        artifact.value.artifactId,
        artifact.value.version
      );

      var matched = artifactKeys.indexOf(instanceArtifactKey) > -1;
      if (matched) {
        // this is where each instance event put together
        var instanceEvent = _.pick(
          instance,
          config.getInstanceEventsProperties()
        );
        instancesEvents.push(instanceEvent);
      }
    }
  });
});

//
//  Updating the persisted list of pending instance events.
//
instancesEvents = _.uniq(instancesEvents);
instancesEvents.forEach(function(instanceEvent) {
  db.saveInstanceEvent(instanceEvent);
});
