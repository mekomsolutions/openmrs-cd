# The OpenMRS CD Jenkins Docker image
The OpenMRS CD leverages a Jenkins Docker container with a number of pre-installed plugins. And once in a while the Docker image must be changed, for instance when:
* A new plugin must be installed.
* An existing plugin must be upgraded or removed.
* Jenkins itself must be upgraded.
* Something must be changed to the Debian-based Linux distribution of the Jenkins container.

In those cases you will want to build the new image containing your changes and test it locally. The build can simply be done like this:
```bash
gradle docker:build
```
After the image build has successfully completed you will want to re-run the Docker container. Your newly build image is the one that will be picked up by Docker. The best is to start from scratch (as explained [here](README.md#working-out-of-the-sources-directly)). But if you already have been running the container, it is best to just stop it, remove it and `docker run` it over again:
```bash
docker stop openmrscd
docker rm openmrscd
```

## Jenkins plugins management: plugins.txt
The list of plugins that are pre-installed is managed through [plugins.txt](docker/config/plugins.txt). It is a simple text-based list of each plugin's artifact ID followed by the desired version. For example with the Matrix Authorization Strategy Plugin:
```
matrix-auth:2.3
```
This file is processed by the Dockerfile, so editing means is equivalent to making an edit to the Dockerfile and will require to rebuild the Docker image as explained above.