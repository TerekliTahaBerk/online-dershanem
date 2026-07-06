import assert from "node:assert/strict";
import test from "node:test";
import { priceCatalogItems, priceCatalogSelection } from "./checkout-pricing";

test("catalog selection rejects missing and unknown products", () => {
  assert.equal(priceCatalogSelection({ category: "", subject: "" }), 0);
  assert.equal(priceCatalogSelection({ category: "ATTACK", subject: "CHEAP" }), 0);
});

test("catalog items ignore client prices and reject unknown products", () => {
  assert.equal(
    priceCatalogItems([{ id: "x", name: "x", category: "ATTACK", subject: "CHEAP", qty: 1 }]),
    null,
  );
});
