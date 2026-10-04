import assert from "node:assert/strict";
import test from "node:test";
import { publicTallyEmbedUrl, tallyEmbedHeight } from "./tally-embed";

test("public iframe uses its own form and only the documented embed options", () => {
  const url = new URL(publicTallyEmbedUrl("0QpdQB"));
  assert.equal(url.origin, "https://tally.so");
  assert.equal(url.pathname, "/embed/0QpdQB");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    alignLeft: "1", hideTitle: "1", transparentBackground: "1", dynamicHeight: "1",
  });
  assert.throws(() => publicTallyEmbedUrl("0QpdQB?ref=someone"));
});

test("height messages require the correct form, event and finite bounded number", () => {
  const message = { event: "Tally.FormHeight", payload: { formId: "0QpdQB", height: 1234.2 } };
  assert.equal(tallyEmbedHeight(JSON.stringify(message), "0QpdQB"), 1235);
  assert.equal(tallyEmbedHeight(message, "vGRQ5X"), null);
  assert.equal(tallyEmbedHeight({ ...message, event: "Tally.FormSubmitted" }, "0QpdQB"), null);
  for (const height of ["820", -1, 0, NaN, Infinity, 30_001]) {
    assert.equal(tallyEmbedHeight({ ...message, payload: { ...message.payload, height } }, "0QpdQB"), null);
  }
  for (const value of [null, [], "invalid JSON", { event: "Tally.FormHeight" }, " ".repeat(4097)]) {
    assert.equal(tallyEmbedHeight(value, "0QpdQB"), null);
  }
});
