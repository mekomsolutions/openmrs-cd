# OpenMRS CD
> A dockerized [Jenkins](https://jenkins.io/) server ready to manage [OpenMRS](https://openmrs.org/) and [Bahmni](https://www.bahmni.org/) instances.

## User guide

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

## Developer guide

Gradle is used to build all the artifacts that make the OpenMRS CD.

### The parent project (root folder)

In order to build all components of the OpenMRS CD run the following command from the root folder:
```
gradle build
```
Each subproject's 'build' tasks will run.

### The 'docker' component
```
cd docker/
gradle build
```
This task builds the Docker image used as a base for the OpenMRS CD. See the [Dockerfile](docker/Dockerfile).

```
gradle deploy
```
This deploys the Docker image on the Mekom Solutions Docker Hub repository. This is not run by default when running the `gradle build` of the parent Gradle project

### The 'jenkins_home' component

OpenMRS CD not only needs a Docker image for its binaries but also requires a Jenkins Home folder providing the base Jenkins configuration.

```
cd jenkins_home/
gradle build
```
This will package a zip archive of the jenkins_home folder.

**Note:** _Developing with the Jenkins_home component requires to use `git clean -Xdf`. Please read the [note for developpers](jenkins/README.md) first._

### The 'jobs' component

This folder holds the Pipelines that the Jenkins server will fetch directly from GitHub. They do not need to be packaged and deployed. That is why, unlike the other components, 'jobs' does not implement any build task. 

### The 'app' component

The 'app' folder provides scripts and resources run by the Jenkins pipelines and jobs.
```
cd app/
gradle build
```
This will run tests tasks configured for this build and generate a zip packaged file of all scripts and resources if successful.

The zip package is located at the default Gradle location for build artifacts: **./app/build/distributions/**