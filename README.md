# OpenMRS CD
> A dockerized [Jenkins](https://jenkins.io/) server ready to manage [OpenMRS](https://openmrs.org/) and [Bahmni](https://www.bahmni.org/) instances.

## User Guide

To start a new OpenMRS CD server

**1** - Clone the openmrs-cd repository:

**Note:** _we assume that all cloned repositories are saved in the home `~/repos` folder._
```
cd ~/repos/
git clone https://github.com/mekomsolutions/openmrs-cd && cd openmrs-cd
```

**2** - Run a new container:
```
docker run --name openmrscd  -p 8080:8080 \
  -v ~/repos/openmrs-cd/app:/opt/app \
  -v ~/repos/openmrs-cd/jenkins/jenkins_home:/var/jenkins_home \
  mekomsolutions/openmrscd:1.0.1-SNAPSHOT
```
Where `openmrscd` is the name of the Jenkins container.

**Note:** _Not all components are deployed on a remote repo yet. That is why we use the `~/repos/openmrs-cd/` sources as mounted volumes._

**3** - Launch the **artifact_repo.js** script to configure the artifacts repository credentials and artifact upload URLs:
```
docker exec -it openmrscd \
  bash -c "cd /usr/share/jenkins/ && npm install && node artifact_repo.js"
```
And answer the prompted questions.

**Note:** _If you do not want to enter the artifacts repository URLs and authentication details by hand (through the CLI) you can just edit **usr/share/jenkins/artifact_repo_default.json** (see the default one [here](docker/config/artifact_repo_default.json) as an example) with your own repo URLs and ID and then run the script again. It will detect the file and ask you to use it with the values provided in it._

## Developer Guide

>OpenMRS CD is a Dockerized Jenkins with preconfigured jobs. Those jobs run Node JS scripts or Node-generated Bash scripts.

This explains the structure and content of the root folder of the project:

```
.
├── app
├── docker
└── jenkins
```
**app** is the Node JS area, **docker** holds the Dockerfile (and other resources needed to configure the container) and **jenkins** contains the parts of Jenkins home that are preconfigured, as well as the pipelines Jenkinsfiles.

Gradle is used to run all build tasks and package all artifacts that make the OpenMRS CD.

### The 'app' component
Developing on the OpenMRS CD means working in here most of the time.
That is because the bulk of the logic of what the OpenMRS CD does lives here. Almost all Jenkins jobs are built on the following pattern:
>Jenkins jobs run Node scripts that generate Bash scripts that in turn perform the core CD tasks.

This is how one would build the underlying Node JS app:
```
cd app/
npm run all
```
And this must be done before submitting code commits.
However note that the code base is not really built into anything since the container links directly to **/app**, but this formats the code and runs the test suite.

The app developer guide can be found [here](app/README.md).

### The 'docker' component
```
cd docker/
gradle build
```
This task builds the Docker image used as a base for the OpenMRS CD. See the [Dockerfile](docker/Dockerfile).

```
gradle deploy
```
This deploys the Docker image on the Mekom Solutions Docker Hub repository. This is not run by default or by the parent build, see below.

### The 'jenkins' component

OpenMRS CD not only needs a Docker image for its binaries but also requires a 'Jenkins home' folder that provides the Jenkins preconfiguration.

```
cd jenkins/
gradle build
```
This will package a zip archive of the jenkins folder.

**Note:** _Developing with the jenkins component may require to use `git clean -Xdf` from time to time. Please read the [note for developpers](jenkins/README.md) first._

### The parent project (root folder)

Finally it is possible to build everything at once from the root level:
```
gradle build
```
This will cascade down to all child builds and run them.