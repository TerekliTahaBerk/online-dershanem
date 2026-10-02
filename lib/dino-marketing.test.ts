import assert from "node:assert/strict";
import test from "node:test";
import { getDinoMarketingCopy } from "./dino-marketing";
import { getPanelFeatureFlags } from "./panel-feature-flags";
import { footerColumnsForProducts, primaryNavForDino } from "./site-content";

for (const enabled of [false, true]) {
  test(`Dino sayfası ve masaüstü/mobil/footer menüsü aynı durumu anlatır: ${enabled}`, () => {
    const snapshot = getPanelFeatureFlags({ PANEL_FEATURE_DINO_AI: String(enabled) });
    const copy = getDinoMarketingCopy(snapshot.dinoAi);
    assert.equal(copy.status, enabled ? "Sınırlı pilot" : "Yakında");
    assert.match(copy.description, enabled ? /sınırlı pilotta/ : /henüz yayında değil/);
    assert.doesNotMatch(copy.description, /her ürünün içinde çalışır|bayrak|kapalı/);
    const menuLink = primaryNavForDino(snapshot.dinoAi).find((link) => link.href === "/dino-ai");
    const footerLink = footerColumnsForProducts([], snapshot.dinoAi)
      .flatMap((column) => column.links).find((link) => link.href === "/dino-ai");
    assert.equal(menuLink?.label, copy.navLabel);
    assert.equal(menuLink?.accessibleLabel, copy.navLabel);
    assert.equal(footerLink?.label, copy.navLabel);
    assert.ok(!primaryNavForDino(snapshot.dinoAi).map((link) => String(link.href)).includes("/kamplar"));
  });
}
