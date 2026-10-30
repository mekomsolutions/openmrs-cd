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
    actions: {
      reset: { requestId: "1" },
      redeploy: { requestId: "1" }
    },
    data: [{ type: "sql" }]
  };

  function withChanges(changes) {
    return Object.assign({}, existing, changes);
  }

  function withActions(resetId, redeployId) {
    return withChanges({
      actions: {
        reset: { requestId: resetId },
        redeploy: { requestId: redeployId }
      }
    });
  }

  it("should not request any action when requestIds are unchanged.", function() {
    expect(gitops.resolveAction(existing, withChanges({}))).toBeNull();
  });

  it("should request a redeploy when actions.redeploy.requestId changes.", function() {
    expect(gitops.resolveAction(existing, withActions("1", "2"))).toEqual(
      "redeploy"
    );
  });

  it("should request a reset when actions.reset.requestId changes.", function() {
    expect(gitops.resolveAction(existing, withActions("2", "1"))).toEqual(
      "reset"
    );
  });

  it("should treat any unique string as a requestId.", function() {
    expect(
      gitops.resolveAction(
        existing,
        withActions("1", "8812bace-07b6-4900-86b1-8911e7f64b7d")
      )
    ).toEqual("redeploy");
  });

  it("should prefer reset over redeploy.", function() {
    expect(gitops.resolveAction(existing, withActions("2", "2"))).toEqual(
      "reset"
    );
  });

  it("should prefer destroy when the instance is inactive.", function() {
    expect(
      gitops.resolveAction(
        existing,
        Object.assign(withActions("2", "2"), { active: "false" })
      )
    ).toEqual("destroy");
    expect(
      gitops.resolveAction(existing, withChanges({ active: false }))
    ).toEqual("destroy");
  });

  it("should request a create for new instances, ignoring requestIds.", function() {
    expect(gitops.resolveAction({}, withActions("2", "2"))).toEqual("create");
  });

  it("should reject a UUID declared by several instance files.", function() {
    var uuidPaths = {};
    uuidPaths[existing.uuid] = ["instances/dev/a.json", "instances/dev/b.json"];

    expect(function() {
      gitops.checkUuidConflicts(
        existing,
        "instances/dev/a.json",
        {},
        uuidPaths
      );
    }).toThrowError(/also used by: instances\/dev\/b\.json/);
  });

  it("should reject a new file matching a stored instance.", function() {
    expect(function() {
      gitops.checkUuidConflicts(
        existing,
        "instances/dev/new.json",
        existing,
        {}
      );
    }).toThrowError(/conflicts with existing instance 'c2c-dev'/);
  });

  it("should accept a file with a unique UUID.", function() {
    var uuidPaths = {};
    uuidPaths[existing.uuid] = ["instances/dev/a.json"];

    expect(function() {
      gitops.checkUuidConflicts(
        existing,
        "instances/dev/a.json",
        {},
        uuidPaths
      );
    }).not.toThrow();
  });

  it("should request an update when deployable sections change.", function() {
    expect(
      gitops.resolveAction(existing, withChanges({ envVars: { A: "1" } }))
    ).toEqual("update");
    expect(
      gitops.resolveAction(
        existing,
        withChanges({ description: "metadata only" })
      )
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
    ["destroy", "reset"].forEach(function(action) {
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
    var event = gitops.buildInstanceEvent(existing, withActions("1", "2"));
    expect(event).toEqual({ uuid: existing.uuid, name: existing.name });

    event = gitops.buildInstanceEvent(
      existing,
      withChanges({ data: [{ type: "instance" }] })
    );
    expect(event.data).toEqual([{ type: "instance" }]);
  });
});
