# OpenMRS CD
> A dockerized [Jenkins](https://jenkins.io/) server ready to manage [OpenMRS](https://openmrs.org/) and [Bahmni](https://www.bahmni.org/) instances.

## Quick Start

The following steps describe a way to gather the OpenMRS CD artifacts locally and run the Docker container based on them. In a Un\*x shell:

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
cd ~ && \
mvn dependency:copy \
  -Dartifact=net.mekomsolutions:openmrs-cd:$VERSION:zip \
  -DoutputDirectory=. && \
unzip ./openmrs-cd-$VERSION.zip && rm ./openmrs-cd-$VERSION.zip && mv ./openmrs-cd-$VERSION ./openmrs-cd
```

**4** - Run the `openmrscd` container:
```bash
docker run --name openmrscd  -p 8080:8080 \
  -v ~/openmrs-cd/node-scripts:/opt/node-scripts \
  -v ~/openmrs-cd/jenkins_home:/var/jenkins_home \
  -v ~/openmrs-cd/app_data:/var/lib/openmrs_cd/app_data \
  mekomsolutions/openmrscd:$VERSION
```
After the container has started, the customized Jenkins instance will be accessible at [http://localhost:8080](http://localhost:8080) with the following credentials: **admin** / **password**.

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

## Developer Guide

>OpenMRS CD is a Dockerized Jenkins with preconfigured jobs. Those jobs run Node JS scripts or Node-generated Bash scripts.

This explains the structure and content of the root folder of the project:

```
.
├── docker
├── jenkins
└── node-scripts
```
**node-scripts** is the Node JS scripts area, **docker** holds the Dockerfile (and other resources needed to configure the container) and **jenkins** contains the parts of Jenkins home that are preconfigured, as well as the pipelines' Jenkinsfiles.

Gradle is used to run all build tasks and package all artifacts that make the OpenMRS CD.

### Working out of the sources directly

When developing on the CD the best is to mount the Docker volumes right out of the sources.

**1** - Clone the openmrs-cd repository:

**Note:** _we assume that cloned repositories should go into the home `~/repos` folder._
```bash
mkdir -p ~/repos && cd ~/repos && \
  git clone https://github.com/mekomsolutions/openmrs-cd && cd openmrs-cd
```

**2** - Run the `openmrscd` container based on the `latest` tag:
```bash
docker run --name openmrscd  -p 8080:8080 \
  -v ~/repos/openmrs-cd/node-scripts:/opt/node-scripts \
  -v ~/repos/openmrs-cd/jenkins/jenkins_home:/var/jenkins_home \
  mekomsolutions/openmrscd:latest
```

### The 'node-scripts' component
Developing on the OpenMRS CD means working in here most of the time.
That is because the bulk of the logic of what the OpenMRS CD does lives here. Almost all Jenkins jobs are built on the following pattern:
>Jenkins jobs run Node scripts that generate Bash scripts that in turn perform the core CD tasks.

This is how one would build the underlying Node JS app:
```bash
cd node-scripts/
gradle build
```
And this must be done before submitting code commits.
However note that the code base is not really built into anything since the container links directly to **/node-scripts**, but this formats the code and runs the test suite.

The Node scripts developer guide can be found [here](node-scripts/README.md).

### The 'docker' component
```bash
cd docker/
gradle build
```
This task builds the Docker image used as a base for the OpenMRS CD. See the [Dockerfile](docker/Dockerfile).

```bash
gradle deploy
```
This deploys the Docker image on the Mekom Solutions Docker Hub repository. This is not run by default or by the parent build, see below.

### The 'jenkins' component

OpenMRS CD not only needs a Docker image for its binaries but also requires a 'Jenkins home' folder that provides the Jenkins preconfiguration.

```bash
cd jenkins/
gradle build
```
This will package a zip archive of the jenkins folder.

**Note:** _Developing with the jenkins component may require to use `git clean -Xdf` from time to time. Please read the [note for developpers](jenkins/README.md) first._

### The parent project (root folder)

Finally it is possible to build everything at once from the root level:
```bash
gradle build
```
This will cascade down to all child builds and run them.