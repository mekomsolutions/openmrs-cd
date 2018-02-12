## Note for devs: Working with the Jenkins_Home folder

By default a Jenkins home folder contains configuration files, binaries (for instance plugins) or historic build files etc, all mixed up together.

In order to just create a clean OpenMRS CI that comes with no historical data or conflicting plugins binaries or anything, we want to only commit a minimal set of files in the Jenkins home folder and let the rest of the missing files be rebuilt by Jenkins itslef (those files are built at startup)

To do so, we have **gitignored many files and folders** that we consider not being pure configuration files.
And as a consequence of this, when a developer will start an OpenMRS CI Docker container with its jenkins_home mounted at the repository location, Jenkins will fill this folder with a lot of files.

### 2 problems are emerging:

First, those files will not appear in the `git status` list. Which means if one is not careful, one would not even notice that they are here.

Second, a change made on the newly started CI server may work on your local computer but may not work for others once jenkins_home is pushed on the remote repo.

To prevent this to happen it is important to always verify that your new changes still work fine on a "clean" Git repository,
The key to that is to use the `git clean -Xdf` parameter to delete all the gitignored files and then restart your container, so it creates a new _jenkins_home_ folder from a blank page.

Let's describe the process in details:

- Checkout the sources
`git checkout https://github.com/mekomsolutions/openmrs-ci`
or
`git pull` (if you have had cloned the repo already)

- Then run your container mapped with the _jenkins_home_ repo location (this may not be the exact command but the idea is here)
```
docker run --name myjenkins -p 8080:8080 -v ~/repos/openmrs-ci/jenkins_home/jenkins_home:/var/jenkins_home mekomsolutions/openmrsci:1.0.0-SNAPSHOT 
```

- Apply your changes on the CI

- Commit __locally__

- Run `git clean -Xdf` (`git clean -Xdfn` for a dry run)

- Restart your container then confirm that all works as expected

- When all is fine and working as expected, push your commit to the GitHub remote repository.