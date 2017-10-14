# How to add a new project type?

A framework is set in place to let you easily add a new project type. Please follow the documentation below.

- create a new **impl/type.js** file, where 'type' is your project type (eg, 'openmrscore.js', 'bahmniconfig.js'...) ('impl' is the folder in which all project types implementations are. You can as well copy from an existing file to get a starting point)

- Have a look at the [model.js](./model.js) file and see what methods your project type must implement.
For instance:
```
  /**
  * An object that represents a source code project 
  * This is an interface to document which field should be implemented when creating a new project type
  *
  */
  Project: function (artifact) {
    this.getBuildScript = function () {
      return new BuildScript()
    }
    this.getBuildScriptAsString = function () {
      return new String()
    }
    this.getArtifact = function  () {
      return new Artifact()
    }   
  }
```

So at the time of this article, a project type must implement:
- getBuildScript()
- getBuildScriptAsString()
- getArtifact()

Implement those methods in your new file and make sure they return the type of object documented in the interface.

And that's it.

The **build.js** script will be able to then provide the needed elements back to the pipeline (in the form of a 'build.sh' and 'artifact.env' files) and all will work fine.

### Note:
You can develop your script directly in your terminal, though you need to export few env vars first:
```
export type="type" WORKSPACE="/tmp/"
```
where 'type' is to be replaced by your project type.
Then run 
```
node build.js
```
To see if the whole script runs fine.

