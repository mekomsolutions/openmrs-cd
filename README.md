![alt tag](readme/ocd3.png)

# OpenMRS CD 3 (OCD3)

> A dockerized [Jenkins](https://jenkins.io/) server ready to manage dockerized [OpenMRS](https://openmrs.org/) and [Bahmni](https://www.bahmni.org/) instances.

OCD3 in a nutshell:

* Builds and deploys all OpenMRS or Bahmni related software artifacts.
* Provides a definition framework for OpenMRS and Bahmni servers.
* Delivers server instances to Linux-powered hosts.
* Tracks code and configuration changes and propagates them to its managed server instances.

- [User documentation](#user-documentation) — define instances, trigger builds, run OCD3.
- [Developer documentation](#developer-documentation) — change OCD3, including [design decisions](#design-decisions).

## User documentation

### Build and deploy a project

There are multiple options depending of the type of project you are deploying, but mainly the 3 following ones should cover 99% of cases:

- default
- maven
- distribution

The build is triggered by a Webhook that must be added to your hosting SCM service (GitHub, GitLab...).
The Webhook expects 2 query parameters:

* `[projectType=default|maven|distribution ...]`. Defaults to default. See list of all supported project types here
* `[credentialsId=<arbitrary_name_of_the_credentials_entry_in_Jenkins_to_clone_the_repo>]` . Defaults to gitHubCredentials.
Eg:
https://username:password@localhost:8080/generic-webhook-trigger/invoke?projectType=default&credentialsId=myGitLabRepoCredentials



How to configure Webhook for OCD3 on GitHub?

#### Add Webhook

![](readme/gh_add_webhook.png)

#### Create Webhook

![](readme/gh_create_webhook.png)

#### Verify Webhook

![](readme/gh_verify_webhook.png)

See [here](https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks) for additional documentation.



#### `default`:

The `default` project type should cover most cases. It assumes that build and deploy instructions are provided in a custom file present at the root of the project and named **.ocd3.yml** (or .ocd3.yaml)

The **.ocd3.yml** file should display as below:

```
version: 1
build:
  bash_commands: <bash command>
deploy:
  bash_commands: <bash command>
  artifact:
    groupId: <a group ID>
    artifactId: <a artifact ID>
    version: <a version>
rebuildOnDependencyChanges: true|false
```

Note that the `artifact` section is **required only if your project is not a Maven project**.
Note that the `rebuildOnDependencyChanges`, if set to `true`, will parse the project's POM file and save its dependencies so to later rebuild when any dependending artifact has changed.

See an example for a Maven project:

```
version: 1
build:
  bash_commands: "mvn clean test"
deploy:
  bash_commands: "mvn clean deploy -DskipTests -DaltDeploymentRepository=mks-nexus::default::https://nexus.mekomsolutions.net/repository/maven-snapshots"
rebuildOnDependencyChanges: "true"
```

Show webhook URL:

```
https://<user>:<password>@openmrs-cd.mekomsolutions.net/generic-webhook-trigger/invoke
```



#### `maven`:

This project type will suit to most Maven projects that simply need to apply standard Maven commands:

- `mvn clean install`
- `mvn clean deploy -DaltDeploymentRepository=...`
- with some additional nuances

Show webhook URL:

```
https://<user>:<password>@openmrs-cd.mekomsolutions.net/generic-webhook-trigger/invoke?projectType=maven
```



#### `distribution`:

A special project type to not only build the project using standard Maven commands but also save its Maven dependencies in a way that the distribution is rebuilt anytime one of the dependency has been rebuilt.

Show webhook URL:

```
https://<user>:<password>@openmrs-cd.mekomsolutions.net/generic-webhook-trigger/invoke?projectType=distribution
```



#### `openmrsmodule`, `initializer`, `odooaddon`...:

There are other types available but most of them are now deprecated, being replaced by the 3 ones described above.

The full list can be found in the [src/pipeline1/impl/](node-scripts/src/pipeline1/impl) folder.

### GitOps instance files

Instance definitions live in a GitOps repository under `instances/<env>/*.json`. The environment is the folder immediately under `instances/` (for example `instances/prod/foo.json` is in `prod`). The `type` field is not used to decide the environment.

| Trigger in the instance file | Action | What OCD3 runs |
|---|---|---|
| New file (instance not in the OCD3 database) | `create` | `pipeline3` with `creation=true`, and change flags set for each non-empty section |
| `"active": false` or file deleted | `destroy` | `destroy-instance` with `recreate=false` |
| `actions.reset.requestId` changed | `reset` | `destroy-instance` with `recreate=true`, which then runs `pipeline3` |
| `actions.redeploy.requestId` changed | `redeploy` | `pipeline3` with artifacts, deployment and properties changes (data only if the `data` section also changed) |
| `artifacts`, `deployment`, `data`, `properties`, `envVars`, `scripts` or `active` changed | `update` | `pipeline3` with the matching change flags (`envVars`, `scripts` and `active` map to deployment) |

```json
{
  "name": "c2c-dev",
  "uuid": "8812bace-07b6-4900-86b1-8911e7f64b7d",
  "actions": {
    "reset": { "requestId": "a1b2c3" },
    "redeploy": { "requestId": "f4e5d6" }
  }
}
```

`requestId` is a unique string (a counter, uuid, timestamp, or any other token), not a schedule. An action fires only when the value differs from the one stored in the OCD3 database. Adding one of these fields for the first time to an existing instance also counts as a change. They are ignored on a new instance because creating it already deploys it. Changes limited to metadata (such as `description`, `group` or `labels`) are saved without deploying anything.

In protected environments (`prod`), these actions are refused and nothing is saved:

- `"active": false` and deleting the file (destroy).
- Changing `actions.reset.requestId` (reset).
- Moving the file to another environment folder.

Create, update and redeploy are allowed in `prod`.

GitOps files own their `uuid`: a new file may already carry one, and it is kept as is. Existing instances are matched by `uuid` first. These files are rejected:

- A newly added file whose `uuid` or `name` matches an instance definition already stored in the OCD3 database.
- Any file whose `uuid` is also declared by another instance file in the repository.
- A rename of an instance (same `uuid`, new `name`).

### Secrets in instance definitions

To avoid entering clear text secrets, use either `jenkinsCredentials(<path>)` or `vault(path#key)` anywhere in the instance definition.

| Reference | Source |
|---|---|
| `jenkinsCredentials(openmrs.password)` | JSON path in the Jenkins "secret text" credentials named `<group>` and `<group>_<type>` |
| `vault(secret/c2c/prod#db_password)` | Key `db_password` of the HashiCorp Vault secret at path `secret/c2c/prod` |

```json
"envVars": {
  "OPENMRS_USERNAME": "jenkinsCredentials(openmrs.password)",
  "DB_PASSWORD": "vault(secret/c2c/prod#db_password)",
  "DB_URL": "mysql://root:vault(secret/c2c/prod#db_password)@mysql:3306/openmrs"
}
```

See more on Jenkins Credentials [here](https://www.jenkins.io/doc/book/using/using-credentials/).

**Jenkins credentials.** Credentials must be of type "Secret text". The name must be either a `group` or a pair `group_type`. The secret text is a JSON object, navigated with **dot notation** (any depth). All instances matching the group or group/type pair can use the secret. If keys conflict, group/type takes precedence over group.

Example credential named `hsc` or `hsc_dev`:

```
{
  "openmrs": {
    "password": "password123"
  }
}
```

**Vault.** The path is the one used by `vault kv get`: for KV v2 the `data/` segment is not written. A reference that cannot be resolved fails the build.

### Run OCD3 in production

The following steps describe a way to gather OCD3 artifacts locally and run the Docker container based on them. In a Unx shell:

**1** - Set the target version:

```bash
export VERSION=3.0.0-SNAPSHOT
```

**2** - Copy the artifacts out of the Nexus repo into the local Maven repo:

```bash
mvn dependency:get \
  -DgroupId=net.mekomsolutions \
  -DartifactId=openmrs-cd \
  -Dversion=$VERSION \
  -Dpackaging=zip \
  -DremoteRepositories=https://nexus.mekomsolutions.net/repository/maven-public
```

**3** - Unpack everything into openmrs-cd on the home folder:

```bash
mvn dependency:copy -Dartifact=net.mekomsolutions:openmrs-cd:$VERSION:zip -DoutputDirectory=/tmp/ && unzip /tmp/openmrs-cd-$VERSION.zip -d /tmp/ && rm /tmp/openmrs-cd-$VERSION.zip && rsync -av --delete /tmp/openmrs-cd-$VERSION/ ~/openmrs-cd/ && rm -r /tmp/openmrs-cd-$VERSION
```

**4** - Run the `openmrscd` container:

```bash
docker run -dti --name openmrscd  -p 8080:8080 \
  -v ~/openmrs-cd/node-scripts:/opt/node-scripts \
  -v ~/openmrs-cd/jenkins_home:/var/jenkins_home \
  -v ~/openmrs-cd/app_data:/var/lib/openmrs_cd/app_data \
  mekomsolutions/openmrscd:$VERSION
```

After the container has started, the customized Jenkins instance will be accessible at [http://localhost:8080](http://localhost:8080) with the following credentials: **admin** / **password**.

Authorize 'jenkins' user to write to the app_data folder:

```bash
docker exec -it openmrscd \
  bash -c "sudo chown -R jenkins:jenkins /var/lib/openmrs_cd/app_data/"
```

**Attention:** _The app data folder will contain the CD's file-based database. Make sure to keep it in a safe location._

**5** - Setup your Maven repo:
You must configure the coordinates of your Maven repo if you intend to deploy your own Maven artifacts with the CD.
Launch the **artifact_repo.js** script to configure the artifacts repository credentials and artifacts upload URLs:

```bash
docker exec -it openmrscd \
  bash -c "cd /usr/share/jenkins/ && npm install && node artifact_repo.js"
```

And answer the prompted questions.

**Note:** _If you do not want to enter the artifacts repository URLs and authentication details by hand (through the CLI) you can just edit **usr/share/jenkins/artifact_repo_default.json** (see the default one [here](docker/config/artifact_repo_default.json) as an example) with your own repo URLs and ID and then run the script again. It will detect the file and ask you to use it._

## Developer documentation

> OCD3 is a Dockerized Jenkins with preconfigured jobs. Those jobs run Node JS scripts or Node-generated Bash scripts.

```
.
├── docker
├── jenkins
└── node-scripts
```

**node-scripts** is the Node JS scripts area, **docker** holds the Dockerfile (and other resources needed to configure the container) and **jenkins** contains the parts of Jenkins home that are preconfigured, as well as the pipelines' Jenkinsfiles.

Gradle is used to run all build tasks and package all artifacts that make OCD3.

```bash
./gradlew node-scripts:build   # format and test Node scripts
./gradlew docker:build        # rebuild the openmrscd image (see readme/docker)
./gradlew jenkins:build       # package jenkins_home
./gradlew build               # all of the above
```

To then deploy:

```
export mksRepoUrl=...
export mksRepoUsername=...
export mksRepoPassword=...
./gradlew deploy
```

### Local stack

When developing on the CD the best is to mount the Docker volumes right out of the sources.

**1** - Clone the openmrs-cd repository:

**Note:** _we assume that cloned repositories should go into the home_ `~/repos` _folder. Adapt the commands below in accordance to your own local setup._

```bash
mkdir -p ~/repos && cd ~/repos && \
  git clone https://github.com/mekomsolutions/openmrs-cd && cd openmrs-cd
```

**2** - Build the Node scripts:

```bash
./gradlew node-scripts:build
```

**3** - Copy `.env.example` to `.env` (gitignored). For the bundled Vault, use token auth:

```
VAULT_ADDR=http://vault:8200
VAULT_AUTH_METHOD=token
VAULT_TOKEN=root
```

**4** - Run Jenkins and, optionally, a dev-mode Vault and jump/target hosts:

```bash
docker compose --profile vault up -d
(cd tests/vagrant && vagrant up)
```

The bundled Vault is in-memory, unsealed, root token `root`. Secrets are lost when it stops. AppRole is the default login in production; token is only this local fallback. See [tests/vagrant/README.md](tests/vagrant/README.md) for jump/target SSH hosts.

Rebuild the image after changing Jenkins plugins (`docker/config/plugins.txt`) or `docker/resources/init.groovy.d/vault.groovy`. See [readme/docker/README.md](readme/docker/README.md).

Developing with the jenkins component may require `git clean -Xdf` from time to time. Read [readme/jenkins/README.md](readme/jenkins/README.md) first.

### Components

The bulk of OCD3 logic is in **node-scripts**. Almost all Jenkins jobs follow this pattern:

> Jenkins jobs run Node scripts that generate Bash scripts that in turn perform the core CD tasks.

`./gradlew node-scripts:build` formats the code and runs the test suite. The container links directly to `/node-scripts`. Code structure, conventions and tests: [readme/node-scripts/README.md](readme/node-scripts/README.md).

### Design decisions

**GitOps.** The `git-instance-events` job polls the GitOps repository and runs `gitops/gitops.js` on every instance definition changed under `instances/**/*.json`. The script writes `instance-processing-report.json`. A SystemGroovy step then schedules `pipeline3` or `destroy-instance` for each file that requests an action. GitOps never queues instance events, so `instance-events-cron` and its type-based filtering are not involved.

Action precedence is destroy, then create, then reset, then redeploy, then update. The environment comes from the folder under `instances/`, not the `type` field: type-based prod rules would drop GitOps updates to prod instances, and a `dev`-folder file with `type: prod` would be treated as production incorrectly. The first successful commit is bootstrap (not treated as adding files), so an already populated database does not cause uuid conflicts. Moving a file within `instances/` is not treated as adding a file. Deleting a file whose instance was never deployed does nothing. The SystemGroovy step also refuses to schedule `destroy-instance` for a protected environment.

**Secrets.** pipeline3 scans the instance definition for `vault(path#key)`, fetches those keys with the Jenkins HashiCorp Vault plugin (`withVault`), and puts a `path#key` → value map in the `VAULT_SECRETS` env var. Node scripts call `utils.resolveSecrets()`, which substitutes both `jenkinsCredentials()` (from `SECRETS`) and `vault()` (from `VAULT_SECRETS`). Node never talks to Vault.

Vault is configured from environment variables on the `openmrscd` container by `docker/resources/init.groovy.d/vault.groovy` on every Jenkins start. It creates the `ocd3-vault` credential and sets the global Vault configuration. Vault is disabled when `VAULT_ADDR` is empty. AppRole is the default (`VAULT_ROLE_ID` / `VAULT_SECRET_ID`). Token is used when `VAULT_AUTH_METHOD=token`, or as a local-dev fallback when role id and secret id are missing but `VAULT_TOKEN` is set. The plugin is pinned in `docker/config/plugins.txt`; changing it requires an image rebuild.

| Variable | Description |
|---|---|
| `VAULT_ADDR` | Vault URL, for example `http://vault:8200` or `https://vault.example.com` |
| `VAULT_AUTH_METHOD` | `approle` (default), `token` or `kubernetes` |
| `VAULT_ROLE_ID`, `VAULT_SECRET_ID`, `VAULT_APPROLE_PATH` | AppRole credentials and mount (default `approle`) |
| `VAULT_TOKEN` | Token, for `token` auth or the local-dev fallback |
| `VAULT_K8S_ROLE`, `VAULT_K8S_MOUNT` | Kubernetes auth role and mount (default `kubernetes`) |
| `VAULT_KV_VERSION` | KV engine version, `2` (default) or `1` |
| `VAULT_NAMESPACE` | Vault Enterprise namespace (optional) |
| `VAULT_SKIP_VERIFY` | `true` to skip TLS verification |
