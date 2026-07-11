import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../app/api/odk/checkout/start/route";

test("new ODK checkout starts return 410 Gone", async () => {
  const response = await POST();
  assert.equal(response.status, 410);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  assert.deepEqual(await response.json(), {
    ok: false,
    error:
      "Deneme Kulübü şu anda satışta değildir. Güncel matematik ders paketleri için Ders Paketleri sayfasını inceleyebilirsiniz.",
  });
});
