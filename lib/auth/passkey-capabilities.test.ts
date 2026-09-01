import assert from "node:assert/strict";
import test from "node:test";
import { credentialIsPlatformBound, mapWebAuthnClientError } from "./passkey-capabilities";

test("platform passkey detection prefers internal transport", () => {
  assert.equal(
    credentialIsPlatformBound({ transports: ["internal"], deviceType: "multiDevice" }),
    true,
  );
  assert.equal(
    credentialIsPlatformBound({ transports: ["hybrid"], deviceType: "multiDevice" }),
    false,
  );
});

test("webauthn client errors are translated for mobile users", () => {
  assert.match(
    mapWebAuthnClientError(new Error("The request is not allowed by the user agent or the platform in the current context")),
    /uygulama kodunu/i,
  );
});
