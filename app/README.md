## Developing Node JS scripts for the OpenMRS CD

### Conventions and Patterns

#### Parameterize with `config`.
This applies to
* Custom environment variables
* File names and paths
* Dir paths
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