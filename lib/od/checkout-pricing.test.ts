import assert from "node:assert/strict";
import test from "node:test";
import { priceCatalogItems, priceCatalogSelection } from "./checkout-pricing";

test("catalog selection rejects missing and unknown products", () => {
  assert.equal(priceCatalogSelection({ category: "", subject: "" }), 0);
  assert.equal(
    priceCatalogSelection({ category: "ATTACK", subject: "CHEAP" }),
    0,
  );
});

test("catalog items ignore client prices and reject unknown products", () => {
  assert.equal(
    priceCatalogItems([
      { id: "x", name: "x", category: "ATTACK", subject: "CHEAP", qty: 1 },
    ]),
    null,
  );
});

test("catalog checkout supports multiple server-priced lines and quantities", () => {
  const lgs = {
    id: "LGS__Matematik Ders Paketi",
    name: "LGS Matematik Ders Paketi",
    category: "LGS",
    subject: "Matematik Ders Paketi",
    qty: 1,
  };

  assert.equal(priceCatalogItems([{ ...lgs, qty: 2 }])?.[0].priceCents, 200000);

  // Matematik dışındaki branşlar da katalogdan fiyatlanır.
  const fen = {
    ...lgs,
    id: "LGS__Fen Bilimleri Ders Paketi",
    name: "LGS Fen Bilimleri Ders Paketi",
    subject: "Fen Bilimleri Ders Paketi",
  };
  assert.equal(priceCatalogItems([fen])?.[0].priceCents, 200000);
  assert.equal(priceCatalogItems([lgs, { ...lgs, id: "sibling" }])?.length, 2);
  assert.equal(priceCatalogItems([{ ...lgs, qty: 100 }]), null);
});
