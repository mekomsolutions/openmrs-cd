"use strict";

/**
 * Processes instance definition changes from the GitOps repository.
 * Saves definitions and reports one action per file (create, update, redeploy,
 * recreate, destroy) that a following SystemGroovy step turns into Jenkins jobs.
 * The environment is the folder under instances/, never the 'type' field.
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
const config = require(cst.CONFIGPATH);
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

const ACTION_CREATE = "create";
const ACTION_UPDATE = "update";
const ACTION_DESTROY = "destroy";
const ACTION_RECREATE = "recreate";
const ACTION_REDEPLOY = "redeploy";
const DESTRUCTIVE_ACTIONS = [ACTION_DESTROY, ACTION_RECREATE];

function isInactive(active) {
  return active === false || active === "false";
}

/**
 * The environment of an instance file is its folder: instances/<env>/...
 */
function getEnvironment(filePath) {
  var parts = (filePath || "").split("/");
  return parts[0] === "instances" && parts.length > 2 ? parts[1] : null;
}

function isProtectedPath(filePath) {
  return (
    config.getGitOpsProtectedEnvironments().indexOf(getEnvironment(filePath)) >
    -1
  );
}

function assertActionAllowed(action, filePath) {
  if (DESTRUCTIVE_ACTIONS.indexOf(action) > -1 && isProtectedPath(filePath)) {
    throw new Error(
      "Destructive action '" + action + "' is not allowed for " + filePath +
        " (environment '" + getEnvironment(filePath) + "')"
    );
  }
}

/**
 * pipeline3 change flags for the sections that changed. Scripts, env vars and
 * reactivation only take effect through the deployment step.
 */
function changeFlags(changedSections) {
  var changed = function(section) {
    return !_.isUndefined(changedSections[section]);
  };
  return {
    artifactsChanges: changed("artifacts"),
    deploymentChanges:
      changed("deployment") ||
      changed("envVars") ||
      changed("scripts") ||
      changed("active"),
    dataChanges: changed("data"),
    propertiesChanges: changed("properties")
  };
}

function hasDeployableChanges(flags) {
  return _.some(_.values(flags));
}

function timestampChanged(existingInstance, instanceDefinition, field) {
  return (
    !_.isEmpty(instanceDefinition[field]) &&
    instanceDefinition[field] !== existingInstance[field]
  );
}

/**
 * Determines which lifecycle action an instance file requests.
 * Precedence: inactive (destroy) > new instance (create) > recreateAt > redeployAt
 * > changed deployable sections (update).
 * Timestamps are ignored for new instances since creation deploys them anyway.
 */
function resolveAction(existingInstance, instanceDefinition) {
  if (isInactive(instanceDefinition.active)) {
    return ACTION_DESTROY;
  }
  if (_.isEmpty(existingInstance)) {
    return ACTION_CREATE;
  }
  if (timestampChanged(existingInstance, instanceDefinition, "recreateAt")) {
    return ACTION_RECREATE;
  }
  if (timestampChanged(existingInstance, instanceDefinition, "redeployAt")) {
    return ACTION_REDEPLOY;
  }
  var flags = changeFlags(
    buildInstanceEvent(existingInstance, instanceDefinition)
  );
  return hasDeployableChanges(flags) ? ACTION_UPDATE : null;
}

/**
 * Looks up the stored instance for a GitOps file, preferring its UUID.
 * Fails clearly on name clashes and renames, which the DB keys cannot represent.
 */
function findExistingInstance(instanceDefinition) {
  var uuid = instanceDefinition.uuid;
  var name = instanceDefinition.name;

  if (_.isEmpty(uuid)) {
    return db.getInstanceDefinition(null, name);
  }

  var byUuid = db.getInstanceDefinition(uuid);
  if (!_.isEmpty(byUuid)) {
    if (!_.isEmpty(name) && byUuid.name !== name) {
      throw new Error(
        "Renaming instance " + uuid + " from '" + byUuid.name + "' to '" +
          name + "' is not supported"
      );
    }
    return byUuid;
  }

  var byName = _.isEmpty(name) ? {} : db.getInstanceDefinition(null, name);
  if (!_.isEmpty(byName)) {
    throw new Error(
      "Instance name '" + name + "' is already used by instance " + byName.uuid
    );
  }
  return {};
}

/**
 * Maps each UUID found in the instance files of the working tree to the files declaring it.
 */
function collectUuidPaths(filePaths) {
  var uuidPaths = {};
  filePaths.forEach(function(filePath) {
    try {
      var uuid = JSON.parse(fs.readFileSync(filePath, "utf8")).uuid;
      if (!_.isEmpty(uuid)) {
        uuidPaths[uuid] = (uuidPaths[uuid] || []).concat(filePath);
      }
    } catch (error) {
      // Unparsable files are reported when they are processed
    }
  });
  return uuidPaths;
}

/**
 * Returns any stored instance definition sharing the UUID or name of a file.
 */
function findStoredInstance(instanceDefinition) {
  var byUuid = _.isEmpty(instanceDefinition.uuid)
    ? {}
    : db.getInstanceDefinition(instanceDefinition.uuid);
  if (!_.isEmpty(byUuid) || _.isEmpty(instanceDefinition.name)) {
    return byUuid;
  }
  return db.getInstanceDefinition(null, instanceDefinition.name);
}

/**
 * Rejects UUIDs that clash with another instance file or, for a newly added
 * file, with an instance definition already stored in the OCD3 database.
 *
 * @param {Object} storedInstance - The stored instance matching a newly added file, {} otherwise.
 */
function checkUuidConflicts(
  instanceDefinition,
  filePath,
  storedInstance,
  uuidPaths
) {
  var uuid = instanceDefinition.uuid;
  var otherPaths = _.without(_.get(uuidPaths, uuid, []), filePath);
  if (!_.isEmpty(uuid) && !_.isEmpty(otherPaths)) {
    throw new Error(
      "UUID " + uuid + " in " + filePath + " is also used by: " +
        otherPaths.join(", ")
    );
  }
  if (!_.isEmpty(storedInstance)) {
    throw new Error(
      "New file " + filePath + " conflicts with existing instance '" +
        storedInstance.name + "' (" + storedInstance.uuid + ")"
    );
  }
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

function actionResult(instanceDefinition, filePath, action, extra) {
  if (action) {
    log.info(
      "",
      "Instance " + instanceDefinition.uuid + ": '" + action + "' requested"
    );
  }
  return Object.assign(
    {
      path: filePath,
      processed: true,
      instanceUuid: instanceDefinition.uuid,
      instanceName: instanceDefinition.name,
      action: action
    },
    extra
  );
}

/**
 * @param {Object} context - isAddedFile: the file was added since the last build;
 *    uuidPaths: UUID to file paths map of the whole working tree.
 */
async function processInstanceFile(fileContent, filePath, context) {
  try {
    var instanceDefinition = JSON.parse(fileContent);

    var schemaValidation = await validateInstanceSchema(instanceDefinition);
    if (!schemaValidation.valid) {
      throw new Error(
        "Schema validation failed: " +
          JSON.stringify(schemaValidation.errors || schemaValidation.error)
      );
    }

    var isAddedFile = _.get(context, "isAddedFile", false);
    checkUuidConflicts(
      instanceDefinition,
      filePath,
      isAddedFile ? findStoredInstance(instanceDefinition) : {},
      _.get(context, "uuidPaths", {})
    );

    var existingInstance = findExistingInstance(instanceDefinition);
    var isNewInstance = _.isEmpty(existingInstance);

    validator.validateInstanceDefinition(instanceDefinition, isNewInstance, {
      allowUuidOnCreate: true,
      skipProdTypeRule: true
    });

    var action = resolveAction(existingInstance, instanceDefinition);
    assertActionAllowed(action, filePath);

    var changedSections = buildInstanceEvent(
      existingInstance,
      instanceDefinition
    );

    if (_.isEmpty(instanceDefinition.uuid) && !isNewInstance) {
      instanceDefinition.uuid = existingInstance.uuid;
    }
    if (action === ACTION_DESTROY) {
      instanceDefinition.active = "false";
    }

    var savedDefinition = db.saveInstanceDefinition(instanceDefinition);
    log.info("", "Saved instance definition from " + filePath);
    if (savedDefinition && savedDefinition.uuid) {
      instanceDefinition.uuid = savedDefinition.uuid;
    }

    var environment = { environment: getEnvironment(filePath) };

    if (action === ACTION_CREATE) {
      return actionResult(
        instanceDefinition,
        filePath,
        action,
        Object.assign(environment, {
          artifactsChanges: !_.isEmpty(instanceDefinition.artifacts),
          deploymentChanges: !_.isEmpty(instanceDefinition.deployment),
          dataChanges: !_.isEmpty(instanceDefinition.data),
          propertiesChanges: !_.isEmpty(instanceDefinition.properties)
        })
      );
    }
    if (action === ACTION_REDEPLOY) {
      return actionResult(
        instanceDefinition,
        filePath,
        action,
        Object.assign(environment, {
          artifactsChanges: true,
          deploymentChanges: true,
          dataChanges: !_.isUndefined(changedSections.data),
          propertiesChanges: true
        })
      );
    }
    if (action === ACTION_UPDATE) {
      return actionResult(
        instanceDefinition,
        filePath,
        action,
        Object.assign(environment, changeFlags(changedSections))
      );
    }
    if (action) {
      return actionResult(instanceDefinition, filePath, action, environment);
    }
    log.info("", "No deployable changes in " + filePath);
    return actionResult(instanceDefinition, filePath, null, environment);
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
    assertActionAllowed(ACTION_DESTROY, filePath);

    var oldContent = await git.show([previousCommit + ":" + filePath]);
    var deletedDefinition = JSON.parse(oldContent);

    var existing = _.isEmpty(deletedDefinition.uuid)
      ? db.getInstanceDefinition(null, deletedDefinition.name)
      : db.getInstanceDefinition(deletedDefinition.uuid);

    if (_.isEmpty(existing)) {
      log.info("", "Deleted file " + filePath + " was never deployed; skipping");
      return {
        path: filePath,
        status: "deleted",
        processed: false,
        reason: "Instance not found in the OCD3 database"
      };
    }

    db.saveInstanceDefinition({
      uuid: existing.uuid,
      name: existing.name,
      active: "false"
    });

    return actionResult(existing, filePath, ACTION_DESTROY, {
      environment: getEnvironment(filePath)
    });
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

// Bootstrap files are not "added": the DB may already know them from a previous OCD3 setup
const STATUS_BOOTSTRAP = "B";

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
    return { status: STATUS_BOOTSTRAP, path: filePath };
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

    var uuidPaths = collectUuidPaths(
      (await listAllInstanceFiles()).map(function(f) {
        return f.path;
      })
    );

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

        if (
          file.oldPath &&
          isProtectedPath(file.oldPath) &&
          getEnvironment(file.oldPath) !== getEnvironment(file.path)
        ) {
          throw new Error(
            "Moving " + file.oldPath + " to " + file.path +
              " is not allowed: instances cannot leave environment '" +
              getEnvironment(file.oldPath) + "'"
          );
        }

        var content = await readFile(file.path, "utf8");
        results.push(
          await processInstanceFile(content, file.path, {
            isAddedFile: file.status === "A",
            uuidPaths: uuidPaths
          })
        );
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
        if (result.action) {
          log.info("", "Action requested: " + result.action);
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

module.exports = {
  resolveAction: resolveAction,
  buildInstanceEvent: buildInstanceEvent,
  checkUuidConflicts: checkUuidConflicts,
  getEnvironment: getEnvironment,
  assertActionAllowed: assertActionAllowed,
  changeFlags: changeFlags
};

if (require.main === module) {
  getChangedFilesContent();
}
