"use strict";

describe("GitOps instance processing", function() {
  // deps
  const path = require("path");

  // setup
  const fileInTest = path.resolve("src/gitops/gitops.js");
  const gitops = require(fileInTest);

  const existing = {
    uuid: "8812bace-07b6-4900-86b1-8911e7f64b7d",
    name: "c2c-dev",
    redeployAt: "2026-10-01T09:00:00Z",
    recreateAt: "2026-10-01T09:00:00Z",
    data: [{ type: "sql" }]
  };

  function withChanges(changes) {
    return Object.assign({}, existing, changes);
  }

  it("should not request any action when timestamps are unchanged.", function() {
    expect(gitops.resolveAction(existing, withChanges({}))).toBeNull();
  });

  it("should request a redeploy when redeployAt changes.", function() {
    expect(
      gitops.resolveAction(
        existing,
        withChanges({ redeployAt: "2026-10-02T09:00:00Z" })
      )
    ).toEqual("redeploy");
  });

  it("should request a recreate when recreateAt changes.", function() {
    expect(
      gitops.resolveAction(
        existing,
        withChanges({ recreateAt: "2026-10-02T09:00:00Z" })
      )
    ).toEqual("recreate");
  });

  it("should prefer recreate over redeploy.", function() {
    expect(
      gitops.resolveAction(
        existing,
        withChanges({
          redeployAt: "2026-10-02T09:00:00Z",
          recreateAt: "2026-10-02T09:00:00Z"
        })
      )
    ).toEqual("recreate");
  });

  it("should prefer destroy when the instance is inactive.", function() {
    expect(
      gitops.resolveAction(
        existing,
        withChanges({
          active: "false",
          redeployAt: "2026-10-02T09:00:00Z",
          recreateAt: "2026-10-02T09:00:00Z"
        })
      )
    ).toEqual("destroy");
    expect(
      gitops.resolveAction(existing, withChanges({ active: false }))
    ).toEqual("destroy");
  });

  it("should request a create for new instances, ignoring timestamps.", function() {
    expect(
      gitops.resolveAction(
        {},
        withChanges({
          redeployAt: "2026-10-02T09:00:00Z",
          recreateAt: "2026-10-02T09:00:00Z"
        })
      )
    ).toEqual("create");
  });

  it("should reject a UUID declared by several instance files.", function() {
    var uuidPaths = {};
    uuidPaths[existing.uuid] = ["instances/dev/a.json", "instances/dev/b.json"];

    expect(function() {
      gitops.checkUuidConflicts(existing, "instances/dev/a.json", {}, uuidPaths);
    }).toThrowError(/also used by: instances\/dev\/b\.json/);
  });

  it("should reject a new file matching a stored instance.", function() {
    expect(function() {
      gitops.checkUuidConflicts(existing, "instances/dev/new.json", existing, {});
    }).toThrowError(/conflicts with existing instance 'c2c-dev'/);
  });

  it("should accept a file with a unique UUID.", function() {
    var uuidPaths = {};
    uuidPaths[existing.uuid] = ["instances/dev/a.json"];

    expect(function() {
      gitops.checkUuidConflicts(existing, "instances/dev/a.json", {}, uuidPaths);
    }).not.toThrow();
  });

  it("should request an update when deployable sections change.", function() {
    expect(
      gitops.resolveAction(existing, withChanges({ envVars: { A: "1" } }))
    ).toEqual("update");
    expect(
      gitops.resolveAction(existing, withChanges({ description: "metadata only" }))
    ).toBeNull();
  });

  it("should derive pipeline3 change flags from changed sections.", function() {
    expect(gitops.changeFlags({ uuid: "x", data: [] })).toEqual({
      artifactsChanges: false,
      deploymentChanges: false,
      dataChanges: true,
      propertiesChanges: false
    });
    expect(gitops.changeFlags({ scripts: [] }).deploymentChanges).toBe(true);
  });

  it("should take the environment from the folder, not the type.", function() {
    expect(gitops.getEnvironment("instances/prod/foo.json")).toEqual("prod");
    expect(gitops.getEnvironment("instances/uat/sub/foo.json")).toEqual("uat");
    expect(gitops.getEnvironment("instances/foo.json")).toBeNull();
    expect(gitops.getEnvironment("other/prod/foo.json")).toBeNull();
  });

  it("should refuse destructive actions in protected environments.", function() {
    ["destroy", "recreate"].forEach(function(action) {
      expect(function() {
        gitops.assertActionAllowed(action, "instances/prod/foo.json");
      }).toThrowError(/not allowed/);
      expect(function() {
        gitops.assertActionAllowed(action, "instances/dev/foo.json");
      }).not.toThrow();
    });
    ["create", "update", "redeploy", null].forEach(function(action) {
      expect(function() {
        gitops.assertActionAllowed(action, "instances/prod/foo.json");
      }).not.toThrow();
    });
  });

  it("should only include changed sections in instance events.", function() {
    var event = gitops.buildInstanceEvent(
      existing,
      withChanges({
        redeployAt: "2026-10-02T09:00:00Z",
        data: [{ type: "sql" }]
      })
    );
    expect(event).toEqual({ uuid: existing.uuid, name: existing.name });

    event = gitops.buildInstanceEvent(
      existing,
      withChanges({ data: [{ type: "instance" }] })
    );
    expect(event.data).toEqual([{ type: "instance" }]);
  });
});
