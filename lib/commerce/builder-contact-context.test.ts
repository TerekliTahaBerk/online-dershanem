import assert from "node:assert/strict";
import test from "node:test";
import { builderContactContext } from "./builder-contact-context";
import { builderContactQuery, type BuilderSelection } from "./package-builder-pricing";

test("existing builder query preserves YKS, products, one-to-one and extra subjects", () => {
  const selection: BuilderSelection = {
    exam: "YKS", dershanem: true, kocum: true, denemeKulubum: false,
    format: "birebir", subject: "Matematik", extraSubjects: ["Fizik"],
  };
  const params = Object.fromEntries(new URLSearchParams(builderContactQuery(selection)));
  assert.deepEqual(builderContactContext(params), {
    exam: "YKS", products: ["onlinedershanem.", "onlinekoçum."],
    format: "Birebir", subjects: ["Matematik", "Fizik"],
  });
});

test("product CTA and unrelated or ambiguous query do not fabricate a builder selection", () => {
  for (const params of [{}, { urun: "onlinedershanem" }, { sinav: "YKS" }, { paket: ["Online Koçum", "Online Dershanem"] }]) {
    assert.equal(builderContactContext(params), null);
  }
  assert.deepEqual(builderContactContext({ paket: "Online Koçum + Online Deneme Kulübüm" }), {
    exam: null, products: ["onlinekoçum.", "onlinedenemekulübüm."], format: null, subjects: [],
  });
});

test("malformed, oversized and HTML query context is rejected rather than reflected", () => {
  for (const paket of [
    '<img src=x onerror=alert(1)>',
    "Online Koçum + Online Koçum",
    "Online Koçum · birebir özel ders",
    "Online Dershanem · <script>bad</script>",
    "Online Dershanem · birebir özel ders · dersler: <script>bad</script>",
    "Online Dershanem · birebir özel ders · dersler: Fen Bilimleri",
    "Online Koçum · x · y · z",
    "x".repeat(601),
  ]) assert.equal(builderContactContext({ paket, sinav: "YKS" }), null);
  assert.equal(builderContactContext({ paket: "Online Dershanem · birebir özel ders · dersler: Fizik", sinav: ["YKS", "LGS"] }), null);
});
