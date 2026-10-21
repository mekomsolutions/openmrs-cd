## Developing Node JS scripts for OCD3

### Code Structure
**Remark:** This part of the dev. guide will keep evolving. It might thus be out-of-date at a given point in time.
```
node-scripts/src/
├── const.js
├── instance-event
│   ├── filter-events.js
│   ├── validate-instance.js
│   └── validator.js
├── pipeline1
│   ├── build.js
│   ├── commons.js
│   ├── downstream-builds.js
│   ├── identify-instances.js
│   ├── impl
│   │   ├── bahmniapps.js
│   │   ├── bahmniconfig.js
│   │   ├── bahmnicore.js
│   │   ├── distribution.js
│   │   ├── openmrsconfig.js
│   │   ├── openmrscore.js
│   │   └── openmrsmodule.js
│   └── post-build.js
├── pipeline3
│   ├── host-preparation.js
│   ├── post-start.js
│   ├── prehost-preparation.js
│   ├── scripts.js
│   ├── start-instance.js
│   ├── startup-monitoring.js
│   └── update-status.js
└── utils
    ├── config.js
    ├── db.js
    ├── model.js
    └── utils.js
```
Set aside const.js which as the name suggests is the location of global constants, there are two types of subfolders that should be distinguished when looking from the root level:
1. **utils** that contain broad purpose libraries needed across the scripts.
2. Jenkins jobs scripts implementations: **pipeline1**, **instance-event** and **pipeline3**.

**Convention:** We are adopting the rule that the Node folder name is the exact name of the job within Jenkins, so as it is stated in the config.xml of the ad-hoc job.

#### Jobs Scripts
Those should be self-explanatory and the developer should always keep an eye on the jobs configurations within Jenkins to understand how everything plugs together. Let's look at an example with pipeline3, [here](https://github.com/mekomsolutions/openmrs-cd/blob/d89776b66749179e36ca8abdebe8d0dac3f12e9e/jenkins/pipelines/pipeline3.jenkinsfile#L8-L14) is the first stage of pipeline3 as per its Jenkinsfile:
```groovy
stage ('Pre-host connection preparation') {
  steps {
    sh 'node /opt/node-scripts/src/$JOB_NAME/prehost-preparation.js'
    sh 'cat $BUILD_PATH/prehost-prepare.sh'
    sh '$BUILD_PATH/prehost-prepare.sh'
  }
}
```
- Step 1: It runs the script **prehost-preparation.js** that generates **prehost-prepare.sh** in the current build directory.
- Step 2: It prints the above Bash script for logging purposes (note that this could also be done in Node.)
- Step 3: It runs the above Bash script that perfoms the actual CD tasks of the pipeline stage.

To understand how the Bash script is generated one needs to study the logic of **prehost-preparation.js**. There is a systematic method though to approach any job and its Node scripts: 1) look at a job configuration (either config.xml or Jenkinsfile) to understand which Node scripts are used and 2) study those scripts to understand the underlying logic leading to the Bash scripts performing the core CD tasks.

#### GitOps (`git-instance-events` job)
The **git-instance-events** job polls the GitOps repository and runs **gitops/gitops.js** on every instance definition changed under `instances/**/*.json`. The script writes `instance-processing-report.json`, and a SystemGroovy step then schedules a downstream job for each file that requests an action:

| Trigger in the instance file | Action | Downstream job |
|---|---|---|
| New file (instance not in the OCD3 database) | `create` | `pipeline3` with `creation=true`, and change flags set for each non-empty section |
| `"active": false` or file deleted | `destroy` | `destroy-instance` with `recreate=false` |
| `recreateAt` changed | `recreate` | `destroy-instance` with `recreate=true`, which then runs `pipeline3` |
| `redeployAt` changed | `redeploy` | `pipeline3` with artifacts, deployment and properties changes (data only if the `data` section also changed) |
| `artifacts`, `deployment`, `data`, `properties`, `envVars`, `scripts` or `active` changed | `update` | `pipeline3` with the matching change flags (`envVars`, `scripts` and `active` map to deployment) |

```json
{
  "name": "c2c-dev",
  "uuid": "8812bace-07b6-4900-86b1-8911e7f64b7d",
  "redeployAt": "2026-10-02T09:00:00Z",
  "recreateAt": "2026-10-02T09:00:00Z"
}
```

`redeployAt` and `recreateAt` are ISO 8601 timestamps. An action fires only when the value differs from the one stored in the OCD3 database, so re-running the job on the same commit does nothing. Adding one of these fields for the first time to an existing instance also counts as a change. Precedence is destroy, then create, then recreate, then redeploy, then update. Timestamps are ignored on a new instance because creating it already deploys it. Changes limited to metadata (such as `description`, `group` or `labels`) are saved without deploying anything. GitOps never queues instance events, so `instance-events-cron` and its type-based filtering are not involved.

**Environments come from folders.** The environment of a file is the folder right under `instances/` (for example `instances/prod/foo.json` is in `prod`). The `type` field is not used to decide the environment. In protected environments (`prod`, see `getGitOpsProtectedEnvironments()` in `config.js`), destructive actions are refused and nothing is saved:
- `"active": false` and deleting the file (destroy).
- Changing `recreateAt` (recreate).
- Moving the file to another environment folder.

Create, update and redeploy are allowed in protected environments. The SystemGroovy step also refuses to schedule `destroy-instance` for a protected environment, as a second safeguard.

GitOps files own their `uuid`: a new file may already carry one, and it is kept as is. Existing instances are matched by `uuid` first. These files are rejected:
- A newly added file whose `uuid` or `name` matches an instance definition already stored in the OCD3 database.
- Any file whose `uuid` is also declared by another instance file in the repository.
- A rename of an instance (same `uuid`, new `name`).

The first run (no previous successful commit) is not treated as adding files, so an already populated database does not cause conflicts. Moving a file within `instances/` is also not treated as adding a file. Deleting a file whose instance was never deployed does nothing.

#### Secrets: Jenkins credentials and Vault
pipeline3 substitutes two kinds of references anywhere in an instance definition (through `utils.resolveSecrets()`):

| Reference | Source |
|---|---|
| `jenkinsCredentials(openmrs.password)` | JSON path in the Jenkins "secret text" credentials named `<group>` and `<group>_<type>` |
| `vault(secret/c2c/prod#db_password)` | Key `db_password` of the HashiCorp Vault secret at path `secret/c2c/prod` |

```json
"envVars": {
  "DB_PASSWORD": "vault(secret/c2c/prod#db_password)",
  "DB_URL": "mysql://root:vault(secret/c2c/prod#db_password)@mysql:3306/openmrs"
}
```

The path is the one used by `vault kv get`: for KV v2 the `data/` segment is not written. In the "Load Jenkins Credentials" stage, pipeline3 collects every `vault(...)` reference, fetches the values with the Jenkins HashiCorp Vault plugin (`withVault`), and passes them to the Node scripts in the `VAULT_SECRETS` env var. A reference that cannot be resolved fails the build.

Vault is configured from environment variables on the `openmrscd` container by `docker/resources/init.groovy.d/vault.groovy`, which runs on every Jenkins start. It creates the `ocd3-vault` credential and sets the global Vault configuration. Vault is disabled when `VAULT_ADDR` is empty.

| Variable | Description |
|---|---|
| `VAULT_ADDR` | Vault URL, for example `http://vault:8200` or `https://vault.example.com` |
| `VAULT_AUTH_METHOD` | `token` (default), `approle` or `kubernetes` |
| `VAULT_TOKEN` | Token, for `token` auth |
| `VAULT_ROLE_ID`, `VAULT_SECRET_ID`, `VAULT_APPROLE_PATH` | AppRole credentials and mount (default `approle`) |
| `VAULT_K8S_ROLE`, `VAULT_K8S_MOUNT` | Kubernetes auth role and mount (default `kubernetes`) |
| `VAULT_KV_VERSION` | KV engine version, `2` (default) or `1` |
| `VAULT_NAMESPACE` | Vault Enterprise namespace (optional) |
| `VAULT_SKIP_VERIFY` | `true` to skip TLS verification |

Copy `.env.example` to `.env` (ignored by git) and keep the block you need.

**Bundled dev Vault.** The `vault` service in `docker-compose.yaml` runs Vault in dev mode (in-memory, unsealed, root token `root`). It is for local testing only, and its secrets are lost when it stops.
```bash
docker compose --profile vault up -d
docker exec -e VAULT_TOKEN=root vault vault kv put secret/c2c/prod db_password=changeme
```

**External Vault.** Set `VAULT_ADDR` and AppRole (or Kubernetes) credentials in `.env`, and start without the `vault` profile. Give the role read access only to the paths OCD3 needs:
```hcl
path "secret/data/c2c/*" {
  capabilities = ["read"]
}
```
```bash
vault policy write ocd3 ocd3.hcl
vault write auth/approle/role/ocd3 token_policies=ocd3 token_ttl=1h
vault read auth/approle/role/ocd3/role-id
vault write -f auth/approle/role/ocd3/secret-id
```

The Vault plugin is pinned in `docker/config/plugins.txt`, so the `openmrscd` image must be rebuilt after changing it.

#### 'utils'
##### config.js
This module exports `config` that provides an API to anything that is configurable: variables names, file paths, jobs names... etc. It is important to leverage config to avoid the pitfalls of any kind of hardcoding. `config` is used to parameterize pretty much everything. See also below the section 'Parameterize with `config`'.

##### db.js
The database layer. This is the API to save, edit, fetch and delete persisted objects. Objects are separated by data model domains and each domain is, at this stage, saved as a separate file that contains the list of all objects currently saved for that domain. This is how `db` currently looks like:
```javascript
module.exports = {
  saveInstanceEvent: function(instanceEvent) {...},

  getAllInstancesDefinitions: function() {...},

  getInstanceDefinition: function(uuid, name) {...},

  saveInstanceDefinition: function(instanceToSave, status) {...},

  deleteInstanceDefinition: function(uuid) {...},

  getAllArtifactDependencies: function() {...},

  getArtifactDependencies: function(artifactKey) {...},

  saveArtifactDependencies: function(artifactKey, dependenciesToSave) {...},

  saveArtifactBuildParams: function(artifactKey, buildParams) {...},

  getArtifactBuildParams: function(artifactKey) {...}
};
```
This API is documented thought its JavaScript doc and is meant to be expanded with the growing needs of the project. 

However what matters is that the API for all file-based domains is build upon 3 core reusable functions that are _not_ exported but leveraged everywhere in the above functions:
```javascript
var getAllObjects = function(domainName, dbFilePath) {...};
```
The generic tool to **fetch all** objects of a domain, please follow the JavaScript doc for details, [here](https://github.com/mekomsolutions/openmrs-cd/blob/d89776b66749179e36ca8abdebe8d0dac3f12e9e/app/src/utils/db.js#L206-L213).
Under the hood this method is used _all the time_ since the code in fact always performs bulk operations on the objects of a domain. For example deleting one object happens like this: 1) the list of all objects is fetched, 2) the target object is filtered out of the list and 3) the reduced list is re-saved entirely.
```javascript
var saveObject = function(domainName, dbFilePath, object, keyPairs, override, status) {...};
```
The generic tool to **save** (or edit) an object of a domain, please follow the JavaScript doc for details, [here](https://github.com/mekomsolutions/openmrs-cd/blob/d89776b66749179e36ca8abdebe8d0dac3f12e9e/app/src/utils/db.js#L273-L286).
```javascript
var getObject = function(domainName, dbFilePath, keyPairs) {...};
```
The generic tool to **fetch** an object of a domain, please follow the JavaScript doc for details, [here](https://github.com/mekomsolutions/openmrs-cd/blob/d89776b66749179e36ca8abdebe8d0dac3f12e9e/app/src/utils/db.js#L243-L252).

##### utils.js

Reusable and testable functions that are constantly needed. `findObject` and `removeObject` are particularly critical to db.js for instance, see [here](https://github.com/mekomsolutions/openmrs-cd/blob/d89776b66749179e36ca8abdebe8d0dac3f12e9e/app/src/utils/utils.js#L157-L221).

##### model.js
Classes definitions that might be reusable across the scripts.

### Conventions and Patterns

#### Naming

##### Jenkins jobs
Jenkins jobs are in lower case with hyphens between words. Eg: **github-webhook**, **instance-event**.
##### Jobs params 
Jenkins jobs parameters are camelCased. Eg. **repoUrl**.
##### Custom env. vars
Jenkins custom environment variables are camelCased. Eg. **instanceUuid**.

**Note:** While env. vars are often written in upper case with underscores between the words, such as `$BUILD_PARAM` ; we have chosen to follow this convention because in Jenkins there jobs params are often exported as custom env. vars. So the point here is that custom env. vars follow the same convention as jobs params above.
##### Properties files, JSON files, text files
Properties files names are in lower with underscores between words. Eg. **artifacts_ids.txt**, **instances_events.json**.

#### Parameterize with `config`.
This applies to
* Custom environment variables
* File names and paths
* Directory paths
* Properties files keys

This does not apply to _native_ environment variables that are always available at runtime. Such as `$WORKSPACE` or `$BUILD_PATH`... etc.

![#71F255](https://placehold.it/15/71F255/000000?text=+) Good practice:
```javascript
process.env[config.varInstanceUuid()]
```
```javascript
fs.writeFileSync(
  process.env.WORKSPACE + "/" + config.getArtifactEnvvarsName(),
  ...
);
```
```javascript
fs.writeFileSync(
  config.getBuildArtifactEnvvarsPath(),
  ...
);
```
![#FF5733](https://placehold.it/15/FF5733/000000?text=+) To avoid:
```javascript
process.env.instanceUuid
```
```javascript
fs.writeFileSync(
  process.env.WORKSPACE + "/artifact.env",
  ...
);
```
There is a double benefit in parameterizing variables via `config`:
1. It allows to expand the test framework by simply mocking `config`.
2. It allows to test that jobs configurations (eg. config.xml and .jenkinsfile) do not unexpectedly change.

#### Add tests that verify jobs parameters.
Those tests ensure that
- Jenkins jobs configurations do not change unexpectedly.
- Jenkins jobs configurations are in line with Node scripts using variables/params... etc named the same way in both places.

[This](https://github.com/mekomsolutions/openmrs-cd/blob/f5c21167cb0b82f539e7398ae702b797c7829277/app/spec/pipeline1/pipeline1.spec.js#L12-L40) is an example of such a test for one of our pipelines. It basically verifies that the job's config.xml does contain expected sections. For example it verifies that the job parameter '`projectType`'' is indeed defined:
```javascript
expect(jenkinsFile).toContain("<name>" + config.varProjectType() + "</name>");
```
However the verification is based on the `config`-parameterized variable name `config.varProjectType()`, and not the variable name `projectType` itself.

Such tests must be added for both
1. Jobs **config.xml**
2. Pipelines **Jenkinsfiles**

Typically those tests are added towards the end of the development process of a new job, when its configuration is well identified.

#### How to require 'config' and 'db' within /src.
```javascript
const cst = require("../const");
const config = require(cst.CONFIGPATH);
const db = require(cst.DBPATH);
```
Of course, this depends where your script is relative to const.js, but the idea is to require the paths provided by const.js [here](https://github.com/mekomsolutions/openmrs-cd/blob/f5c21167cb0b82f539e7398ae702b797c7829277/app/src/const.js#L15-L16).

Other scripts than `config` and `db` should be required as usual using a relative path to the script that requires them.

#### How to require 'config' within /spec: the typical test setup.
Typically one would want to test the overall effect of running a high level script that requires the whole runtime framework to be loaded.
There are often several ways to achieve the loading of a high level test, but for example this could be the structure of a typical framework-sensitive test loading **src/path/to/script.js**:
```javascript
describe("My test suite", function() {
  const path = require("path");
  const proxyquire = require("proxyquire");
  ...

  const cst = require(path.resolve("src/const"));

  it("should verify something.", function() {
    // deps
    const tests = require(path.resolve("spec/utils/testUtils"));

    // setup
    const config = tests.config();
    const db = proxyquire(cst.DBPATH, tests.stubs());

    ...

    // replay
    proxyquire(path.resolve("src/path/to/script.js"), stubs);

    // verif
    ...

    expect(...).toEqual(...);

    // after
    tests.cleanup();
  });
});
```
##### `proxyquire` to load the script
[proxyquire](https://github.com/thlorenz/proxyquire) will perform the stubbing and will load the target script:
```javascript
proxyquire(path.resolve("src/path/to/script.js"), stubs);
```
##### It's all in the stubs for proxyquire
proxyquire needs to know how to stub each path and we have a test framework ready with boilerplate stubs:
```javascript
const tests = require(path.resolve("spec/utils/testUtils"));
...
tests.stubs()
```
New tests may require to introduce new stubs and this can be done by either
- expanding testUtils.js stubs, or
- passing extra stubs to `tests.stubs()`.

##### Tearing down
Those tests using testUtils.js generate a test folder that should be cleaned up after each test:
```javascript
tests.cleanup();
```
Note that it is sometimes convenient to temporarily comment out this line to check the content of the test folder while developing new scripts. The path to the test folder is always printed out precisely for that reason, example:
```bash
$ npm test
...
info Test dir: /var/folders/q7/gqgtc_ys2492hqqt7hb9xw_w0000gn/T/b4xxq
...
$ tree /var/folders/q7/gqgtc_ys2492hqqt7hb9xw_w0000gn/T/b4xxq
/var/folders/q7/gqgtc_ys2492hqqt7hb9xw_w0000gn/T/b4xxq
├── app_data
│   ├── test_artifacts_build_params_1.json
│   └── test_artifacts_dependencies_1.json
└── jobs
    └── test-job
        └── builds
            └── 3
                ├── builds_params.json
                └── test_empty_artifacts_ids.txt
```
The generated test folder above illustrates that those framework-sensitive tests do indeed reproduce what Jenkins home would look like at runtime.
