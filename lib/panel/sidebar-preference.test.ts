import assert from "node:assert/strict";
import { test } from "node:test";
import { SIDEBAR_COOKIE, parseSidebarState } from "./sidebar-preference";

test("kenar çubuğu tercihi yalnız açık 'collapsed' değeriyle gizlenir", () => {
  assert.equal(SIDEBAR_COOKIE, "pn_sidebar");
  assert.equal(parseSidebarState("collapsed"), "collapsed");
  for (const value of ["expanded", "", undefined, null, "COLLAPSED", "1"]) {
    assert.equal(parseSidebarState(value), "expanded", String(value));
  }
});
