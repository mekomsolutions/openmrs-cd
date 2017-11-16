[Pipeline2](../../../jobs/pipelines/pipeline2.jenkinsfile) will identify which server is affected by a given artifact modification.

To do so, each server is mapped with a descriptor and type.
A descriptor is a file that describes what makes a server, ie what are its dependencies. Most of the time the descriptor will be the distro pom.xml the server is built on.
However, other formats could be implemented if needed.
This configuration is found in the **servers.json** file (see section below for more details)

The pipeline first fetches the descriptors (**fetch.js**) and then parses them (**parse.js**) to produce a list of dependencies sorted by artifact. See [dependenciesByArtifact.json](../../spec/utils/resources/dependenciesByArtifact.json)

From there, **compare.js** will compare the artifact provided as input to the dependency list just created and update the **history.json** file which is a stack of all builds that have affected a given server (see below)

In details:

## Inputs required by pipeline2

### **servers.json**:
A file that details the config of all available servers (located in `/var/jenkins_home/`).
This file will likely be built and maintained by another job run beforehand, when a new server is created.

It should look like this (an example can also be found in the Jasmine specs [here](../../spec/pipeline2/resources/servers.json)):
```
{
  "server1": {
    "descriptor": {
      "url": "https://raw.githubusercontent.com/mekomsolutions/openmrs-distro-cambodia/master/pom.xml",
      "type": "pom"
    },
    "type": "dev"
  }, 
  "server2": {
    "descriptor": {
      "url": "https://raw.githubusercontent.com/globalhealthcoalition/openmrs-distro-haiti/master/pom.xml",
      "type": "pom"
    },
    "type": "production"
  } 
}
```

### **artifact.json**

A file that describes the artifact just built.
This file is supposed to be build by an upstream job, likely triggered when a new commit is done on a repo.
This file is currently saved in `/tmp/`.
See below an example of the **artifact.json** file. 
(Another example can be found in the Jasmine specs [here](../../spec/utils/resources/artifact.json))
```
{
  "path": "./target",
  "name": "openmrs-config-cambodia",
  "groupId": "net.mekomsolutions",
  "extension": "zip",
  "version": "1.0-SNAPSHOT",
  "filename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip",
  "destFilename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
}

```


## Output produced by pipeline2

The output of this pipeline will be a log/history object that contains a list of the servers that have been affected by an artifact modification.
Each new modification will create a new line for the server that depends on this artifact.

Note that the `artifact_history` list contains **Artifact** objects (such as defined [here](../pipeline1/model.js#L19-L27))
For example:
```
{
    "server1": {
        "artifacts_history": [
            {
                "path": "./target",
                "name": "openmrs-config-cambodia",
                "groupId": "net.mekomsolutions",
                "extension": "zip",
                "version": "1.0-SNAPSHOT",
                "filename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip",
                "destFilename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
            },
            {
                "path": "./target",
                "name": "openmrs-config-cambodia",
                "groupId": "net.mekomsolutions",
                "extension": "zip",
                "version": "1.0-SNAPSHOT",
                "filename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip",
                "destFilename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
            },
            {
                "path": "./target",
                "name": "rulesengine-omod",
                "groupId": "org.openmrs.module",
                "extension": "zip",
                "version": "0.89-SNAPSHOT",
                "filename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip",
                "destFilename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
            }
        ]
    },
    "server2": {
        "artifacts_history": [
            {
                "path": "./target",
                "name": "rulesengine-omod",
                "groupId": "org.openmrs.module",
                "extension": "zip",
                "version": "0.89-SNAPSHOT",
                "filename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip",
                "destFilename": "openmrs-config-cambodia-1.0-SNAPSHOT.zip"
            }
        ]
    }
}
```
