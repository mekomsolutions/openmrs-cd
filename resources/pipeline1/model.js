module.exports = {

  BuildScript: function (type, comments, script) {
    this.scriptType = type;
    this.comments = comments
    this.value = script;
  },

  /**
  *
  * An object that represents a source code project 
  * This is an interface and each field should be implemented for each type of project
  *
  */
  Project: function (artficat) {
    this.getBuildScript = function () {
      return "This method is not implemented. Please provide an implementation."
    }
    this.getBuildScriptAsString = function () {
      return "This method is not implemented. Please provide an implementation."
    }
    this.artficat = artficat;
  }

}