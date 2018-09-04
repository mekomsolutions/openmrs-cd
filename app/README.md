## Developing Node JS scripts for the OpenMRS CD

### Code Structure
**Remark:** This part of the dev. guide will keep evolving. It might thus be out-of-date at a given point in time.
```
app/src
├── const.js
├── instance-event
│   ├── validate-instance.js
│   └── validator.js
├── models
│   └── model.js
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
│   ├── prehost-preparation.js
│   └── scripts.js
└── utils
    ├── config.js
    ├── db.js
    └── utils.js
```
Set aside const.js which, as the name suggests, is the location of global constants, there are two types of subfolders that should be distinguished when looking from the root level:
1. **utils** that contain broad purpose libraries needed across the app.
2. Jenkins jobs scripts implementations: **pipeline1**, **instance-event** and **pipeline3**.

**Convention:** We are adopting the rule that the Node folder name is the exact name of the job within Jenkins, so as it is stated in the config.xml of the ad-hoc job.

#### Jobs Scripts
Those should be self-explanatory and the developer should always keep an eye on the jobs configurations within Jenkins to understand how everything plugs together. Let's look at an example with pipeline3, [here](https://github.com/mekomsolutions/openmrs-cd/blob/d89776b66749179e36ca8abdebe8d0dac3f12e9e/jenkins/pipelines/pipeline3.jenkinsfile#L8-L14) is the first stage of pipeline3 as per its Jenkinsfile:
```groovy
stage ('Pre-host connection preparation') {
  steps {
    sh 'node /opt/app/src/$JOB_NAME/prehost-preparation.js'
    sh 'cat $BUILD_PATH/prehost-prepare.sh'
    sh '$BUILD_PATH/prehost-prepare.sh'
  }
}
```
- Step 1: It runs the script **prehost-preparation.js** that generates **prehost-prepare.sh** in the current build directory.
- Step 2: It prints the above Bash script for logging purposes (note that this could also be done in Node.)
- Step 3: It runs the above Bash script that perfoms the actual CD tasks of the pipeline stage.

To understand how the Bash script is generated one needs to study the logic of **prehost-preparation.js**. There is a systematic method though to approach any job and its Node scripts: 1) look at a job configuration (either config.xml or Jenkinsfile) to understand which Node scripts are used and 2) study those scripts to understand the underlying logic leading to the Bash scripts performing the core CD tasks.

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
Classes definitions that might be reusable across the entire app.

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
The generated test folder above illustrates that those framework-sensitive tests do indeed reproduce what Jenkins home would look like at run time.