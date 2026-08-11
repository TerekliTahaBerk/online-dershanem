import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../app/api/odk/checkout/start/route";

test("new ODK checkout starts obey rollout and remain intentionally unavailable", async () => {
  const previous = {
    mode: process.env.ODK_ROLLOUT_MODE,
    kill: process.env.ODK_PILOT_KILL_SWITCH,
    acceptance: process.env.ODK_PILOT_ACCEPTANCE_APPROVED,
    security: process.env.ODK_PILOT_SECURITY_REVIEW_APPROVED,
    operations: process.env.ODK_PILOT_OPERATIONS_APPROVED,
  };
  try {
    process.env.ODK_ROLLOUT_MODE = "disabled";
    process.env.ODK_PILOT_KILL_SWITCH = "false";
    let response = await POST();
    assert.equal(response.status, 410);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/i);

    process.env.ODK_ROLLOUT_MODE = "general";
    process.env.ODK_PILOT_ACCEPTANCE_APPROVED = "true";
    process.env.ODK_PILOT_SECURITY_REVIEW_APPROVED = "true";
    process.env.ODK_PILOT_OPERATIONS_APPROVED = "true";
    response = await POST();
    assert.equal(response.status, 410);

    process.env.ODK_PILOT_KILL_SWITCH = "true";
    response = await POST();
    assert.equal(response.status, 503);
  } finally {
    for (const [key, value] of Object.entries({
      ODK_ROLLOUT_MODE: previous.mode,
      ODK_PILOT_KILL_SWITCH: previous.kill,
      ODK_PILOT_ACCEPTANCE_APPROVED: previous.acceptance,
      ODK_PILOT_SECURITY_REVIEW_APPROVED: previous.security,
      ODK_PILOT_OPERATIONS_APPROVED: previous.operations,
    })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
