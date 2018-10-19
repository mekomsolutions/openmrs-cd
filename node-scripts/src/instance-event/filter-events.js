"use strict";

/**
 * Processes the accumulated log of instances events and
 * filter for the build those that need to be processed.
 */

const fs = require("fs");
const path = require("path");

const utils = require("../utils/utils");
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);

const _ = require("lodash");

var instanceEvents = db.getAllInstancesEvents();

//
// Applying the filter on instance events.
// Keeping only the filtered ones on the build path.
//
var filteredEvents = _.filter(instanceEvents, function(event) {
  return event.type != cst.INSTANCETYPE_PROD;
});

fs.writeFileSync(
  config.getFilteredInstancesEventsJsonPath(),
  JSON.stringify(filteredEvents, null, 2)
);

//
// Clearing the database from the processed ones.
//
filteredEvents.forEach(function(event) {
  db.removeInstanceEvent(event);
});
