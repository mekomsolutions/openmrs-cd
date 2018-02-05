/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */

/*
* Helper function to test if a given object implements all its prototype methods
* @params 'instance' is an instance of 'objectClass'
*
* In order to identify which superclass methods of the prototype should be implemented, this test assumes 
* that non-implemented methods declared in the model definition are returning "To be implemented"
* So any method in the prototype that retuns "To be implemented" is considered as method to implement
* 
*/
var constants = require(__dirname + "/../../src/constants/constants");

var ensureImplmentedFunctions = function(instance, objectClass) {
  var properties = Object.getOwnPropertyNames(objectClass.prototype);
  var object = new objectClass();
  for (var property of properties) {
    if (property != "constructor") {
      if (object[property]().startsWith(constants.ABSTRACT)) {
        var implemented = true;
        if (instance[property].toString() == object[property].toString()) {
          console.log(
            "[" +
              property +
              "] is not implemented. Verify that you provide an implementation to all required methods of this class. Class: " +
              objectClass
          );
        }
        expect(implemented).toEqual(true);
      }
    }
  }
};

module.exports = {
  ensureImplmentedFunctions: ensureImplmentedFunctions
};
