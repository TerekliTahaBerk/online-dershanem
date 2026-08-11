import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const checks = [];
const add = (label, ok, detail) => checks.push({ label, status: ok ? "PASS" : "BLOCK", detail });
const wait = (label, detail) => checks.push({ label, status: "WAIT", detail });
const value = (key) => process.env[key]?.trim() || "";
const configured = (key) => {
  const current = value(key).toLowerCase();
  return Boolean(current && !current.includes("replace-with") && !current.includes("changeme") && !current.includes("example"));
};

for (const key of ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "CRON_SECRET", "BLOB_READ_WRITE_TOKEN"]) {
  add(key, configured(key), configured(key) ? "Tanımlı; değer gösterilmedi." : "Eksik veya örnek değer kullanılıyor.");
}

const rolloutMode = value("ODK_ROLLOUT_MODE");
const rolloutModeValid = ["disabled", "pilot", "general"].includes(rolloutMode);
add("ODK_ROLLOUT_MODE enum", rolloutModeValid, rolloutModeValid ? `Mevcut mod: ${rolloutMode}` : "Eksik/geçersiz değer runtime'da disabled olur.");
add("ODK pilot modu", rolloutMode === "pilot", rolloutMode === "pilot" ? "Pilot ön kontrolü etkin." : "Bu komut pilot deploy için ODK_ROLLOUT_MODE=pilot bekler.");
add("ODK_PILOT_KILL_SWITCH", value("ODK_PILOT_KILL_SWITCH") !== "true", value("ODK_PILOT_KILL_SWITCH") === "true" ? "Acil durdurma açık." : "Kapalı.");
for (const key of ["ODK_PILOT_ACCEPTANCE_APPROVED", "ODK_PILOT_SECURITY_REVIEW_APPROVED", "ODK_PILOT_OPERATIONS_APPROVED"]) {
  if (value(key) === "true") add(key, true, "Onaylı.");
  else wait(key, "Canlı pilot kanıtından sonra açılır; ilk aktivasyonu engellemez.");
}

const restoreValue = value("ODK_LAST_RESTORE_DRILL_AT");
const restoreAt = restoreValue ? new Date(restoreValue) : null;
const restoreFresh = Boolean(restoreAt && Number.isFinite(restoreAt.getTime()) && restoreAt <= new Date() && Date.now() - restoreAt.getTime() <= 90 * 86400000);
add("ODK_LAST_RESTORE_DRILL_AT", restoreFresh, restoreFresh ? `Güncel: ${restoreAt.toISOString()}` : "Eksik, gelecekte veya 90 günden eski.");

const vercelPath = resolve(root, "vercel.json");
let lifecycleCron = false;
if (existsSync(vercelPath)) {
  try {
    const vercel = JSON.parse(readFileSync(vercelPath, "utf8"));
    lifecycleCron = Array.isArray(vercel.crons) && vercel.crons.some((cron) => cron.path === "/api/cron/odk-exam-lifecycle" && cron.schedule === "*/5 * * * *");
  } catch { lifecycleCron = false; }
}
add("ODK yaşam döngüsü cron'u", lifecycleCron, lifecycleCron ? "vercel.json içinde 5 dakikalık görev mevcut." : "Cron eksik veya beklenen sıklıkta değil.");
add("0063 migration", existsSync(resolve(root, "prisma/migrations/0063_odk_pilot_rollout/migration.sql")), "Pilot yaşam döngüsü migration dosyası.");
add("Yaşam döngüsü endpoint'i", existsSync(resolve(root, "app/api/cron/odk-exam-lifecycle/route.ts")), "Cron endpoint dosyası.");

console.log("ODK pilot yapılandırma ön kontrolü\n");
for (const check of checks) console.log(`${check.status === "PASS" ? "HAZIR" : check.status === "WAIT" ? "BEKLİYOR" : "BLOKE"}  ${check.label} — ${check.detail}`);
const blockers = checks.filter((check) => check.status === "BLOCK");
const waiting = checks.filter((check) => check.status === "WAIT");
console.log(`\n${checks.length - blockers.length - waiting.length}/${checks.length} kontrol hazır. ${waiting.length} bekleyen, ${blockers.length} bloke kontrol.`);
console.log("Bu komut veritabanına bağlanmaz; admin Pilot yayını ekranındaki canlı veri kapıları ayrıca doğrulanmalıdır.");
if (blockers.length) process.exitCode = 1;
