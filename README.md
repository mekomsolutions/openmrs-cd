# OpenMRS CD
A Jenkins server configured to provide tools to manage OpenMRS servers

# User guide

Here is how to start a new OpenMRS CD server

Git clone the 'openmrs-cd' repository
```
cd ~/repos/
git clone https://github.com/mekomsolutions/openmrs-cd
cd ~/repos/openmrs-cd
```

Run a new container:
```
docker run --name myjenkins  -p 8080:8080 -v ~/repos/openmrs-cd/resources/src/:/opt/resources -v ~/repos/openmrs-cd/jenkins_home/jenkins_home:/var/jenkins_home mekomsolutions/openmrscd:1.0.1-SNAPSHOT
```
where 'myjenkins' is the name of the container. Could be anything.

_Note: For now *not* all components are deployed on a remote repo. That is why we use the '~/repos/openmrs-cd/' sources as mounted volumes._

# Dev guide

Gradle is used to build all the needed artifacts that make the OpenMRS CD.

## The parent project: root folder

In order to build all components of the OpenMRS CD simply run the following command from the root directory:
```
gradle build
```
Each subproject's 'build' tasks will run.


## The 'docker' component
```
cd docker/
gradle build
```
This task builds the Docker image used as a base for the OpenMRS CD. It uses the Dockerfile provided in the `docker/` folder.

```
gradle deploy
```
This deploys the Docker image on the Mekom Solutions Docker Hub repository. This is not run by default when running the `gradle build` of the parent Gradle project

## The 'jenkins_home' component

OpenMRS CD needs not only to use a Docker image for its binaries but it also requires a Jenkins Home folder to provide the base configuration.

```
cd jenkins_home/
gradle build
```
This will package a zip archive of the jenkins_home folder.

Note: Developping with the Jenkins_home component requires to use `git clean -Xdf`. Please read the [note for developpers](jenkins_home/README.md) first.

## The 'jobs' component

This folder holds the Pipelines that the Jenkins server will fetch directly from GitHub. They do not need to be packaged and deployed. That is why, unlike the other components, 'jobs' does not implement any build task. 

## The 'resources' component

The 'resources' folder is here to bring script and resources that will be used by the Jenkins pipelines or jobs.
```
cd resources/
gradle build
```
This will run tests tasks configured for this build and output a zip file of all resources if successful.

The zip archive is located at the default Gradle location for build artifacts, **./resources/build/distributions/resources-1.0.0-SNAPSHOT.zip**

