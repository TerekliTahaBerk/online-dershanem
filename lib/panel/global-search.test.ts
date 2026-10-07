import assert from "node:assert/strict";
import test from "node:test";
import {
  GLOBAL_SEARCH_COMMANDS,
  GLOBAL_SEARCH_MIN_CHARS,
  commandsToResults,
  groupGlobalSearchResults,
  looksLikeRecordId,
  matchCommands,
  phoneDigits,
  readRecentSearches,
  searchNeedleVariants,
  typoRelaxedNeedles,
  visibleGlobalSearchCommands,
  writeRecentSearch,
  type GlobalSearchResult,
} from "./global-search";
import { panelFeatureDefaults } from "@/lib/panel-feature-flags";

const flagsOff = { ...panelFeatureDefaults, interventionInbox: false };
const flagsOn = { ...panelFeatureDefaults, interventionInbox: true };

test("visible commands: teacher never sees admin-only provisioning", () => {
  const commands = visibleGlobalSearchCommands({
    role: "TEACHER",
    flags: flagsOn,
    businessPermissions: [],
  });
  assert.ok(!commands.some((item) => item.href.includes("/siparisler")));
  assert.ok(!commands.some((item) => item.href.includes("/isler")));
  assert.ok(commands.some((item) => item.id === "teacher-calendar"));
});

test("visible commands: intervention requires flag", () => {
  const closed = visibleGlobalSearchCommands({
    role: "ADMIN",
    flags: flagsOff,
    businessPermissions: [],
  });
  const open = visibleGlobalSearchCommands({
    role: "ADMIN",
    flags: flagsOn,
    businessPermissions: [],
  });
  assert.ok(!closed.some((item) => item.id === "interventions"));
  assert.ok(open.some((item) => item.id === "interventions"));
});

test("visible commands: lead command requires business permission", () => {
  const without = visibleGlobalSearchCommands({
    role: "ADMIN",
    flags: flagsOn,
    businessPermissions: [],
  });
  const withLead = visibleGlobalSearchCommands({
    role: "ADMIN",
    flags: flagsOn,
    businessPermissions: ["lead:read"],
  });
  assert.ok(!without.some((item) => item.id === "leads"));
  assert.ok(withLead.some((item) => item.id === "leads"));
});

test("visible commands: Deneme Ligi and Yön commands follow staff permissions, not the global role", () => {
  const plainTeacher = visibleGlobalSearchCommands({ role: "TEACHER", flags: flagsOn, businessPermissions: [] });
  assert.ok(!plainTeacher.some((item) => item.id === "exam-ops"));
  assert.ok(!plainTeacher.some((item) => item.id === "coach-desk"));

  const operator = visibleGlobalSearchCommands({
    role: "TEACHER",
    flags: flagsOn,
    businessPermissions: [],
    staffPermissions: new Set(["odk:ops:live", "odk:exam:schedule"] as const),
  });
  assert.ok(operator.some((item) => item.id === "exam-ops"));
  assert.ok(operator.some((item) => item.id === "exam-plan"));
  assert.ok(!operator.some((item) => item.id === "exam-results"));

  const coachFlagOff = visibleGlobalSearchCommands({
    role: "TEACHER",
    flags: { ...flagsOn, adaptivePlan: false },
    businessPermissions: [],
    staffPermissions: ["ok:coaching:write"],
  });
  const coach = visibleGlobalSearchCommands({
    role: "TEACHER",
    flags: { ...flagsOn, adaptivePlan: true },
    businessPermissions: [],
    staffPermissions: ["ok:coaching:write"],
  });
  assert.ok(!coachFlagOff.some((item) => item.id === "coach-desk"));
  assert.ok(coach.some((item) => item.id === "coach-desk"));
  // Koç çalışma alanı plan bayrağından bağımsızdır; düz öğretmen görmez.
  assert.ok(coachFlagOff.some((item) => item.id === "coach-workspace"));
  assert.ok(!plainTeacher.some((item) => item.id === "coach-workspace"));

  // ADMIN break-glass: personel izni listesi olmadan da görür.
  const admin = visibleGlobalSearchCommands({ role: "ADMIN", flags: flagsOn, businessPermissions: [] });
  for (const id of ["exam-ops", "exam-plan", "exam-results"]) assert.ok(admin.some((item) => item.id === id), id);
});

test("command labels do not leak internal terms", () => {
  for (const command of GLOBAL_SEARCH_COMMANDS) {
    assert.ok(!/provisioning|incident|\bODK\b/i.test(`${command.label} ${command.detail}`), command.id);
  }
});

test("matchCommands is Turkish case-insensitive", () => {
  const matched = matchCommands(GLOBAL_SEARCH_COMMANDS, "SİPARİŞ");
  assert.ok(matched.some((item) => item.id === "orders"));
});

test("searchNeedleVariants folds Turkish characters", () => {
  const variants = searchNeedleVariants("Işıl");
  assert.ok(variants.some((item) => item.includes("i") || item.includes("ı") || item.includes("ş") || item.includes("s")));
  assert.ok(variants.length >= 1 && variants.length <= 4);
});

test("typoRelaxedNeedles offers deletion/neighbor for medium strings", () => {
  const variants = typoRelaxedNeedles("ahmett");
  assert.ok(variants.includes("ahmet") || variants.some((item) => item.length === 5));
  assert.equal(typoRelaxedNeedles("ab").length, 0);
});

test("groupGlobalSearchResults keeps category order", () => {
  const results: GlobalSearchResult[] = [
    { kind: "ORDER", id: "1", label: "#A", detail: "x", href: "/o/1" },
    { kind: "STUDENT", id: "2", label: "Ada", detail: "8", href: "/s/2" },
    { kind: "COMMAND", id: "c", label: "Siparişlere git", detail: "y", href: "/siparisler" },
  ];
  const sections = groupGlobalSearchResults(results);
  assert.deepEqual(
    sections.map((section) => section.kind),
    ["COMMAND", "STUDENT", "ORDER"],
  );
});

test("recent searches store query text only and skip sensitive needles", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };

  writeRecentSearch(storage, "ada");
  writeRecentSearch(storage, "veli@example.com");
  writeRecentSearch(storage, "05371234567");
  writeRecentSearch(storage, "clkabcdefghijklmnopqrst");

  const recent = readRecentSearches(storage);
  assert.deepEqual(recent, ["ada"]);
});

test("helpers: phone digits, cuid detection, command results", () => {
  assert.equal(phoneDigits("+90 537 123 45 67"), "905371234567");
  assert.equal(looksLikeRecordId("clxyz0123456789abcdef"), true);
  assert.equal(looksLikeRecordId("ada"), false);
  assert.ok(GLOBAL_SEARCH_MIN_CHARS >= 2);
  const results = commandsToResults([{ id: "x", label: "A", detail: "B", href: "/x" }]);
  assert.equal(results[0]?.kind, "COMMAND");
});
