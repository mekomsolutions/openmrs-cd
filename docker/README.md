# How to edit the OpenMRS CD Docker image and publish it

Once in a while, one may want to make changes to the OpenMRS CD Docker image.
For instance, updating the Jenkins base version, installing some packages on the image, etc.

Follow these steps:

### Edit the Docker file and make changes

First, edit the Dockerfile to reflect the changes you want.
We work with a Dockerfile to maintain and rebuild our OpenMRS CD Docker image.
It is very important to use this Dockerfile to apply any change you want to the image. Changes that are made on the container but not documented in the Dockerfile will be lost as soon as the image is rebuilt.
In practice, this  means that while you are doing changes and trials on the container directly, such as adding new packages, configuration files, users or anything, keep note of those changes. Then once you are satisfied with it, put the necessary changes, and only those, in the Dockerfile. Make sure as well to not write any unnecessary steps in the Dockerfile.

### Build an image from the Dockerfile

Then build locally a new image based on your new Dockerfile. To do so:
```
gradle build
```

Once built, you can confirm that the new image has been created:
```
docker images
```

See the "CREATED 4 seconds ago"
```
REPOSITORY                 TAG                     IMAGE ID            CREATED             SIZE
mekomsolutions/openmrscd   1.0.1-SNAPSHOT          e248d7f7805b        4 seconds ago       1.2GB
<none>                     <none>                  1cd0dce06107        12 minutes ago      1.2GB
<none>                     <none>                  12b28ea3f3ae        19 minutes ago      1.12GB
```

Then run/start a new container from this new image and confirm all works as you expect. This is an important step to make sure you have not forgotten to put any declaration in the Dockerfile.

```
docker run --name myjenkins  -p 8080:8080 -v ~/repos/openmrs-cd/app:/opt/app -v ~/repos/openmrs-cd/jenkins_home/jenkins_home:/var/jenkins_home mekomsolutions/openmrscd:1.0.1-SNAPSHOT
```

Where **1.0.1-SNAPSHOT** is the version your new image, specified in the [build.gradle](./build.gradle) file.

Note that the **-v** options may differ for you or may just not be present at all depending on if you want to map volumes to your host or not.

**About the version number**:
- The **1.0.1-SNAPSHOT** version number is the Docker image version number and is independant from the OpenMRS CD version number (found at the parent project directory's `../buid.gradle`. As explained above, the Docker image version number is documented in the current sub-project [build.gradle](./build.gradle) file.
- If you're adding changes off of a released image (ie, non-SNAPSHOT) then you should first increment this version number now (in the [build.gradle](./build.gradle#L1) file) and append '-SNAPSHOT' to it.
For example if you want to modify the latest releaesed image, let's say `openmrscd:1.0.0`, then you should make your changes on the next development version, which is `1.0.1-SNAPSHOT`.

### Push the new image on Docker Hub

Once confirmed that all works as expected, push the image to Docker Hub.
```
gradle deploy
```


## Release process

After few changes are made to the Docker image, you may consider releasing the image.
In order to do this, simply modify the version from a SNAPSHOT to a non-SNAPSHOT in the [build.gradle](./build.gradle) file.
Change
```
version = "1.0.1-SNAPSHOT"
```
to
```
version = "1.0.1"
```

Re-build and deploy this new container version:
```
gradle deploy
```

Commit your code changes
```
git add build.gradle
git commit -m "Release 1.0.1"
```

And prepare for the next version:
Edit **build.gradle** to increase the version and add "-SNAPSHOT" to it.
```
version = "1.0.1"
```
to
```
version = "1.0.2-SNAPSHOT"
```

Then run
```
gradle deploy
```

and commit your code changes again
```
git add build.gradle
git commit -m "Next development: 1.0.2-SNAPSHOT"
```

```
git push
```