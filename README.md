# OpenMRS CI
A Jenkins CI server configured to provide tools to manage OpenMRS servers

Gradle is used to build all the needed artifacts that make the OpenMRS CI.

## The parent project: root folder

In order to build all components of the OpenMRS CI simply run the following command from the root directory:
```
gradle build
```
Each subproject's 'build' tasks will run.


## The 'docker' component
```
cd docker/
gradle build
```
This task builds the Docker image used as a base for the OpenMRS CI. It uses the Dockerfile provided in the `docker/` folder.

```
gradle deploy
```
This deploys the Docker image on the Mekom Solutions Docker Hub repository. This is not run by default when running the `gradle build` of the parent Gradle project

## The 'jenkins_home' component

OpenMRS CI needs not only to use a Docker image for its binaries but it also requires a Jenkins Home folder to provide the base configuration.

```
cd jenkins_home
gradle build
```
This will package a zip archive of the jenkins_home folder.

Note: Developping with the Jenkins_home component requires to use `git clean -Xdf`. Please read the [note for developpers](jenkins_home/README.md) first.

## The 'jobs' component

To be implemented


## The 'resources' component

To be implemented