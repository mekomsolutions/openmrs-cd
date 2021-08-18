![alt tag](readme/ocd3.png)

# OpenMRS CD 3 (OCD3)
> A dockerized [Jenkins](https://jenkins.io/) server ready to manage dockerized [OpenMRS](https://openmrs.org/) and [Bahmni](https://www.bahmni.org/) instances.

OCD3 in a nutshell:
* Builds and deploys all OpenMRS or Bahmni related software artifacts.
* Provides a definition framework for OpenMRS and Bahmni servers.
* Delivers server instances to Linux-powered hosts.
* Tracks code and configuration changes and propagates them to its managed server instances.

## User guide

*How to build and deploy a project?*

There are multiple options depending of the type of project you are deploying, but mainly the 3 following ones should cover 99% of cases:
- default
- maven
- distribution

The build is triggered by a Webhook that must be added to your hosting SCM service (GitHub, GitLab...).

<details>

<summary>How to configure Webhook for OCD3 on GitHub?</summary>

### Add Webhook

<img src="readme/gh_add_webhook.png" width="700">

### Create Webhook

<img src="readme/gh_create_webhook.png" width="700">

### Verify Webhook

<img src="readme/gh_verify_webhook.png" width="700">

See [here](https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks) for additional documentation.

</details>


#### `default`:

The `default` project type should cover most cases. It assumes that build and deploy instructions are provided in a custom file present at the root of the project and named **.ocd3.yml** (or .ocd3.yaml)

The **.ocd3.yml** file should display as below:
```
version: 1
build:
  bash_commands: "npm test"
deploy:
  bash_commands: "npm publish"
  artifact:
    groupId: "net.mekomsolutions"
    artifactId: "client-app"
    version: "dev"
```
Note that the `artifact` section is **required only if your project is not a Maven project**.

See an example for a Maven project:
```
version: 1
build:
  bash_commands: "mvn clean test"
deploy:
  bash_commands: "mvn clean deploy -DskipTests -DaltDeploymentRepository=mks-nexus::default::https://nexus.mekomsolutions.net/repository/maven-snapshots"
```

<details>
<summary>Show webhook URL:</summary>

```
https://<user>:<password>@openmrs-cd.mekomsolutions.net/generic-webhook-trigger/invoke
```
</details>


#### `maven`:

This project type will suit to most Maven projects that simply need to apply standard Maven commands:
- `mvn clean install`
- `mvn clean deploy -DaltDeploymentRepository=...`
- with some additional nuances

<details>
<summary>Show webhook URL:</summary>

```
https://<user>:<password>@openmrs-cd.mekomsolutions.net/generic-webhook-trigger/invoke?projectType=maven
```
</details>


#### `distribution`:

A special project type to not only build the project using standard Maven commands but also save its Maven dependencies in a way that the distribution is rebuilt anytime one of the dependency has been rebuilt.

<details>
<summary>Show webhook URL:</summary>

```
https://<user>:<password>@openmrs-cd.mekomsolutions.net/generic-webhook-trigger/invoke?projectType=distribution
```
</details>

#### `openmrsmodule`, `initializer`, `odooaddon`...:

There are other types available but most of them are now deprecated, being replaced by the 3 ones described above.

The full list can be found in the [src/pipeline1/impl/](node-scripts/src/pipeline1/impl) folder.

## Developer Guide

>OCD3 is a Dockerized Jenkins with preconfigured jobs. Those jobs run Node JS scripts or Node-generated Bash scripts.

This explains the structure and content of the root folder of the project:

```
.
├── docker
├── jenkins
└── node-scripts
```
**node-scripts** is the Node JS scripts area, **docker** holds the Dockerfile (and other resources needed to configure the container) and **jenkins** contains the parts of Jenkins home that are preconfigured, as well as the pipelines' Jenkinsfiles.

Gradle is used to run all build tasks and package all artifacts that make OCD3.

### Working out of the sources directly

When developing on the CD the best is to mount the Docker volumes right out of the sources.

**1** - Clone the openmrs-cd repository:

**Note:** _we assume that cloned repositories should go into the home `~/repos` folder. Adapt the commands below in accordance to your own local setup._
```bash
mkdir -p ~/repos && cd ~/repos && \
  git clone https://github.com/mekomsolutions/openmrs-cd && cd openmrs-cd
```
**2** - Build the Node scripts:
```bash
./gradlew node-scripts:build
```

**3** - Run the `openmrscd` container:
```bash
docker-compose up
```

### The 'node-scripts' component
Developing on OCD3 means working in here most of the time.
That is because the bulk of the logic of what OCD3 does lives here. Almost all Jenkins jobs are built on the following pattern:
>Jenkins jobs run Node scripts that generate Bash scripts that in turn perform the core CD tasks.

This is how one would build the underlying Node JS scripts:
```bash
gradle node-scripts:build
```
And this must be done before submitting code commits.
However note that the code base is not really built into anything since the container links directly to **/node-scripts**, but this formats the code and runs the test suite.

A detailed developer guide about the Node scripts can be found [here](readme/node-scripts/README.md).

### The 'docker' component
See [here](readme/docker/README.md).

### The 'jenkins' component

OCD3 not only needs a Docker image for its binaries but also requires a 'Jenkins home' folder that provides a pre-configured Jenkins setup:

```bash
gradle jenkins:build
```
This will package a zip archive of the jenkins folder.

**Note:** _Developing with the jenkins component may require to use `git clean -Xdf` from time to time. Please read the [note for developpers](readme/jenkins/README.md) first._

### The parent project (root folder)

Finally it is possible to build everything at once from the root level:
```bash
./gradlew build
```
This will cascade down to all child builds and run them.

To then deploy:

```
export mksRepoUrl=...
export mksRepoUsername=...
export mksRepoPassword=...
```

```
./gradlew deploy
```

## Starting OCD3 for production

The following steps describe a way to gather OCD3 artifacts locally and run the Docker container based on them. In a Un\*x shell:

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
