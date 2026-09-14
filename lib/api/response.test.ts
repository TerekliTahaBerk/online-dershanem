import test from "node:test";
import assert from "node:assert/strict";
import { API_ERROR_CODES, apiError, apiSuccess } from "./response";

test("apiError kararlı hata zarfını ve status kodunu üretir", async () => {
  const response = apiError(422, API_ERROR_CODES.VALIDATION_ERROR, "Geçersiz veri.", { field: "accountId" });
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    success: false,
    error: { code: "VALIDATION_ERROR", message: "Geçersiz veri.", details: { field: "accountId" } },
  });
});

test("apiSuccess veri ve isteğe bağlı meta zarfını üretir", async () => {
  const response = apiSuccess([{ id: "1" }], { count: 1 });
  assert.deepEqual(await response.json(), {
    success: true,
    data: [{ id: "1" }],
    meta: { count: 1 },
  });
});
