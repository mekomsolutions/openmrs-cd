/**
 * @author Romain Buisson (romain@mekomsolutions.com)
 *
 */

/*
* Helper function to test if a given object implements all its prototype methods
* @params 'instance' is an instance of 'objectClass'
*
* In order to identify which superclass methods of the prototype should be implemented, this test assumes
* that non-implemented methods declared in the model definition are returning a special string.
* Any method in the prototype that returns that string is considered as a method to be implemented.
*
*/
const log = require("npmlog");
const path = require("path");

const cst = require(path.resolve("src/const"));

var ensureImplementedFunctions = function(instance, objectClass) {
  var properties = Object.getOwnPropertyNames(objectClass.prototype);
  var object = new objectClass();
  for (var property of properties) {
    if (property != "constructor") {
      if (object[property]().startsWith(cst.ABSTRACT)) {
        var implemented = true;
        if (instance[property].toString() == object[property].toString()) {
          log.error(
            "",
            "[" +
              property +
              "] is not implemented. You must provide an implementation to all abstract methods of this class: " +
              objectClass
          );
        }
        expect(implemented).toEqual(true);
      }
    }
  }
};

module.exports = {
  ensureImplementedFunctions: ensureImplementedFunctions
};
