"use strict";

/**
 * Processes instance definition changes from the GitOps repository.
 * Saves definitions/events for deploy, and flags inactive/deleted instances
 * for destroy-instance (triggered by a following SystemGroovy step).
 */

const simpleGit = require("simple-git");
const fs = require("fs");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const path = require("path");
const util = require("util");
const _ = require("lodash");
const log = require("npmlog");

const cst = require("../const");
const db = require(cst.DBPATH);
const validator = require("../instance-event/validator");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const git = simpleGit();

const INSTANCE_EVENT_SECTIONS = [
  "type",
  "version",
  "artifacts",
  "deployment",
  "data",
  "properties",
  "scripts",
  "envVars",
  "active",
  "description",
  "group",
  "labels"
];

function isInactive(active) {
  return active === false || active === "false";
}

async function validateInstanceSchema(instanceContent) {
  const schemaPath = path.join(
    __dirname,
    "..",
    "schemas",
    "instance.schema.json"
  );
  const schemaContent = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv();
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(instanceContent);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors
    };
  }

  return { valid: true };
}

/**
 * Builds a partial instance event containing only changed sections so
 * downstream validate-instance does not treat every section as changed.
 */
function buildInstanceEvent(existingInstance, instanceDefinition) {
  if (_.isEmpty(existingInstance)) {
    return _.cloneDeep(instanceDefinition);
  }

  var event = {
    uuid: instanceDefinition.uuid || existingInstance.uuid,
    name: instanceDefinition.name || existingInstance.name
  };

  INSTANCE_EVENT_SECTIONS.forEach(function(section) {
    if (
      !_.isUndefined(instanceDefinition[section]) &&
      !_.isEqual(instanceDefinition[section], existingInstance[section])
    ) {
      event[section] = instanceDefinition[section];
    }
  });

  return event;
}

function parseNameStatusLine(line) {
  var parts = line.split("\t");
  var status = parts[0].trim();
  // Renames: R100\told\tnew — use the new path; keep old for delete handling
  if (status.charAt(0) === "R" && parts.length >= 3) {
    return {
      status: status,
      path: parts[2].trim(),
      oldPath: parts[1].trim()
    };
  }
  return {
    status: status,
    path: parts[1] ? parts[1].trim() : ""
  };
}

async function triggerDestroyForInstance(instanceDefinition, filePath) {
  log.info(
    "",
    "Instance " +
      instanceDefinition.uuid +
      " marked inactive; destroy-instance will be scheduled"
  );

  return {
    path: filePath,
    processed: true,
    instanceUuid: instanceDefinition.uuid,
    needsDestroy: true
  };
}

async function processInstanceFile(fileContent, filePath) {
  try {
    var instanceDefinition = JSON.parse(fileContent);

    var schemaValidation = await validateInstanceSchema(instanceDefinition);
    if (!schemaValidation.valid) {
      throw new Error(
        "Schema validation failed: " +
          JSON.stringify(schemaValidation.errors || schemaValidation.error)
      );
    }

    var existingInstance = db.getInstanceDefinition(
      instanceDefinition.uuid,
      instanceDefinition.name
    );
    var isNewInstance = _.isEmpty(existingInstance);

    validator.validateInstanceDefinition(instanceDefinition, isNewInstance);

    if (isInactive(instanceDefinition.active)) {
      // Ensure uuid is available for destroy (new inactive instances are rejected by validator)
      if (_.isEmpty(instanceDefinition.uuid) && !_.isEmpty(existingInstance)) {
        instanceDefinition.uuid = existingInstance.uuid;
      }
      instanceDefinition.active = "false";
      var savedInactive = db.saveInstanceDefinition(instanceDefinition);
      if (savedInactive && savedInactive.uuid) {
        instanceDefinition.uuid = savedInactive.uuid;
      }
      return await triggerDestroyForInstance(instanceDefinition, filePath);
    }

    var savedDefinition = db.saveInstanceDefinition(instanceDefinition);
    log.info("", "Saved instance definition from " + filePath);

    // Prefer uuid assigned/confirmed by the DB layer
    if (savedDefinition && savedDefinition.uuid) {
      instanceDefinition.uuid = savedDefinition.uuid;
    }

    var instanceEvent = buildInstanceEvent(
      existingInstance,
      instanceDefinition
    );
    db.saveInstanceEvent(instanceEvent);
    log.info("", "Saved instance event for " + filePath);

    return {
      path: filePath,
      processed: true,
      instanceUuid: instanceDefinition.uuid,
      needsDestroy: false
    };
  } catch (error) {
    log.error("", "Error processing instance file " + filePath + ": " + error);
    return {
      path: filePath,
      processed: false,
      error: error.message
    };
  }
}

async function processDeletedInstanceFile(filePath, previousCommit) {
  try {
    var oldContent = await git.show([previousCommit + ":" + filePath]);
    var instanceDefinition = JSON.parse(oldContent);

    if (_.isEmpty(instanceDefinition.uuid) && !_.isEmpty(instanceDefinition.name)) {
      var existing = db.getInstanceDefinition(null, instanceDefinition.name);
      if (!_.isEmpty(existing)) {
        instanceDefinition.uuid = existing.uuid;
        instanceDefinition.name = existing.name;
      }
    }

    if (_.isEmpty(instanceDefinition.uuid)) {
      throw new Error(
        "Cannot destroy deleted instance file without a uuid: " + filePath
      );
    }

    instanceDefinition.active = "false";
    db.saveInstanceDefinition({
      uuid: instanceDefinition.uuid,
      name: instanceDefinition.name,
      active: "false"
    });

    return await triggerDestroyForInstance(instanceDefinition, filePath);
  } catch (error) {
    log.error(
      "",
      "Error processing deleted instance file " + filePath + ": " + error.message
    );
    return {
      path: filePath,
      status: "deleted",
      processed: false,
      error: error.message
    };
  }
}

async function listAllInstanceFiles() {
  var instancesDir = "instances";
  if (!fs.existsSync(instancesDir)) {
    return [];
  }

  function walk(dir) {
    var entries = fs.readdirSync(dir);
    var files = [];
    entries.forEach(function(entry) {
      var fullPath = path.join(dir, entry);
      var stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files = files.concat(walk(fullPath));
      } else if (entry.endsWith(".json")) {
        files.push(fullPath);
      }
    });
    return files;
  }

  return walk(instancesDir).map(function(filePath) {
    return { status: "A", path: filePath };
  });
}

async function getChangedInstanceFiles(previousBuildCommit, currentCommit) {
  var diffSummary = await git.diff([
    previousBuildCommit,
    currentCommit,
    "--name-status"
  ]);

  var changedFiles = [];
  diffSummary
    .split("\n")
    .filter(function(line) {
      return line.length > 0;
    })
    .map(parseNameStatusLine)
    .forEach(function(file) {
      var isInstancePath = function(p) {
        return p && p.startsWith("instances/") && p.endsWith(".json");
      };

      // Renamed out of instances/: treat as a deletion of the old path
      if (
        file.status.charAt(0) === "R" &&
        isInstancePath(file.oldPath) &&
        !isInstancePath(file.path)
      ) {
        changedFiles.push({ status: "D", path: file.oldPath });
        return;
      }

      if (isInstancePath(file.path)) {
        changedFiles.push(file);
      }
    });

  return changedFiles;
}

async function getChangedFilesContent() {
  try {
    var previousBuildCommit = process.env.GIT_PREVIOUS_SUCCESSFUL_COMMIT;
    var currentCommit = process.env.GIT_COMMIT;
    var instanceFiles;

    if (!currentCommit) {
      log.error("", "GIT_COMMIT is not set; cannot process GitOps changes.");
      process.exit(1);
    }

    if (!previousBuildCommit) {
      log.info(
        "",
        "No previous successful commit found; processing all instance files (bootstrap)."
      );
      instanceFiles = await listAllInstanceFiles();
    } else {
      log.info("", "Comparing changes between:");
      log.info("", "Previous build: " + previousBuildCommit);
      log.info("", "Current build: " + currentCommit);
      instanceFiles = await getChangedInstanceFiles(
        previousBuildCommit,
        currentCommit
      );
    }

    log.info("", "Instance files changed: " + JSON.stringify(instanceFiles));

    var results = [];
    for (var i = 0; i < instanceFiles.length; i++) {
      var file = instanceFiles[i];
      try {
        if (file.status === "D") {
          results.push(
            await processDeletedInstanceFile(file.path, previousBuildCommit)
          );
          continue;
        }

        var content = await readFile(file.path, "utf8");
        results.push(await processInstanceFile(content, file.path));
      } catch (error) {
        log.error("", "Error processing file " + file.path + ": " + error);
        results.push({
          path: file.path,
          status: file.status,
          processed: false,
          error: error.message
        });
      }
    }

    log.info("", "Processing Results:");
    results.forEach(function(result) {
      log.info("", "=== " + result.path + " ===");
      if (result.processed) {
        log.info("", "Successfully processed instance definition");
        log.info("", "Instance UUID: " + result.instanceUuid);
        if (result.needsDestroy) {
          log.info("", "Destroy requested for instance");
        }
      } else if (result.error) {
        log.error("", "Error: " + result.error);
      } else {
        log.info("", "Not processed: " + (result.reason || "Unknown reason"));
      }
    });

    await writeFile(
      "instance-processing-report.json",
      JSON.stringify(
        {
          previousBuildCommit: previousBuildCommit || null,
          currentCommit: currentCommit,
          results: results
        },
        null,
        2
      )
    );
  } catch (error) {
    log.error("", "Error: " + error);
    process.exit(1);
  }
}

getChangedFilesContent();
