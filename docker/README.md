# How to edit the OpenMRS CD Docker image and publish it

Once in a while, one may want to make changes to the OpenMRS CD Docker image.
For instance, updating the Jenkins base version, installing some packages on the image, etc.

Follow these steps:

### Edit the Docker file

First, edit the Dockerfile to reflect the changes you want.
We work with a Dockerfile to maintain and rebuild our OpenMRS CD Docker image.
It is very important to use this Dockerfile to apply any change you want to the image. Changes that are not documented in the Dockerfile will be lost as soon as the image is rebuilt.
In practice, this  means that while you are doing changes and trials on the container directly, such as adding new packages, configuration files, users or anything, keep note of those changes. Then once you are satisfied with it, put the necessary changes, and only those, in the Dockerfile. Make sure to not write any unnecessary steps in the Dockerfile.

### Build an image from the Dockerfile

Then build locally a new image based on your new Dockerfile. To do so:
```
docker build . -t mekomsolutions/openmrscd:1.0.1-SNAPSHOT
```

Once built, run/start a container from this new image and confirm all works as you expect. This is an important step to make sure you have not forgotten to put any declaration in the Dockerfile.

**About the version number**:
- The Docker image version number is independant from the OpenMRS CD version number. This version number is documented in the [build.gradle](./build.gradle) file.
- You should only build SNAPSHOTs. Currently, no release is maintained. So you should never build a non-SNAPSHOT version (releases are made by re-tag, no re-build needed. See below in the 'Release process' section).
- If you're adding changes off of a released image (ie, non-SNAPSHOT) then you should increment the version number in the [build.gradle](./build.gradle#L1) file now and append '-SNAPSHOT' to it.
For example if we want to modify the latest image released, let's say `openmrscd:1.0.0`, then we should publish our changes on the next development version, which is `1.0.1-SNAPSHOT`. If a SNAPSHOT version exists already, that's the one we should be working on insted of the release.


### Push the new image on Docker Hub

Once confirmed that all works as expected, push the image to Docker Hub.
```
docker push mekomsolutions/openmrscd:1.0.1-SNAPSHOT
```


## Release process

After few changes are made to the Docker image, we may consider releasing the image.
In order to do this, let's simply ret-ag the latest SNAPSHOT to a non-SNAPSHOT.
For instance:
```
docker pull mekomsolutions/openmrscd:1.0.1-SNAPSHOT

docker tag mekomsolutions/openmrscd:1.0.1-SNAPSHOT mekomsolutions/openmrscd:1.0.1
```

This will create the `1.0.1` tag locally.
You can then push it to Docker Hub, such as explained in section 'Push the new image on Docker Hub'.
```
docker push mekomsolutions/openmrscd:1.0.1
```
