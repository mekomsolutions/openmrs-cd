"use strict";
/**
 * An object that collects the commit metadata out of an HTTP payload
 * that is sent out and processed by a webhook job.
 */

 /* Example:
    {
      "projectType": "openmrsmodule",
      "repoUrl": "https://github.com/openmrs/openmrs-module-attachments",
      "repoName": "openmrs-module-attachments",
      "branchName": "master",
      "commitId": "c71670e"
    }
*/

module.exports = {
  CommitMetadata: function(
    projectType,
    repoUrl,
    repoName,
    branchName,
    commitId
  ) {
    this.projectType = projectType;
    this.repoUrl = repoUrl;
    this.repoName = repoName;
    this.branchName = branchName;
    this.commitId = commitId;
  }
};
