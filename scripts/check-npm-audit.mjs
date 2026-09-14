import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const inputFlagIndex = process.argv.indexOf("--input");
const inputPath = inputFlagIndex === -1 ? null : process.argv[inputFlagIndex + 1];

if (inputFlagIndex !== -1 && !inputPath) {
  console.error("Usage: check-npm-audit.mjs [--input audit.json]");
  process.exit(2);
}

const auditOutput = inputPath
  ? await readFile(inputPath, "utf8")
  : runAudit();
const audit = JSON.parse(auditOutput);
const allowlist = JSON.parse(
  await readFile(new URL("../config/npm-audit-allowlist.json", import.meta.url), "utf8"),
);
const today = new Date().toISOString().slice(0, 10);
const accepted = new Map(
  allowlist.acceptedAdvisories.map((entry) => [String(entry.id), entry]),
);

const highRiskPackages = Object.entries(audit.vulnerabilities ?? {}).filter(
  ([, vulnerability]) => severityRank[vulnerability.severity] >= severityRank.high,
);
const failures = [];

for (const [packageName] of highRiskPackages) {
  const advisoryIds = resolveAdvisoryIds(packageName, new Set());

  if (advisoryIds.size === 0) {
    failures.push(`${packageName}: advisory kimliği çözümlenemedi`);
    continue;
  }

  for (const advisoryId of advisoryIds) {
    const exception = accepted.get(advisoryId);
    if (!exception) {
      failures.push(`${packageName}: yeni advisory ${advisoryId}`);
    } else if (exception.expires < today) {
      failures.push(
        `${packageName}: ${exception.ghsa ?? advisoryId} istisnası ${exception.expires} tarihinde sona erdi`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("npm audit kapısı başarısız:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

const acceptedIds = new Set(
  highRiskPackages.flatMap(([packageName]) => [...resolveAdvisoryIds(packageName, new Set())]),
);
console.log(
  `npm audit kapısı geçti: ${highRiskPackages.length} paket kaydı, ${acceptedIds.size} süreli bilinen advisory.`,
);

function resolveAdvisoryIds(packageName, visiting) {
  if (visiting.has(packageName)) return new Set();
  visiting.add(packageName);

  const vulnerability = audit.vulnerabilities?.[packageName];
  const ids = new Set();

  for (const cause of vulnerability?.via ?? []) {
    if (typeof cause === "string") {
      for (const id of resolveAdvisoryIds(cause, visiting)) ids.add(id);
    } else if (severityRank[cause.severity] >= severityRank.high) {
      ids.add(String(cause.source));
    }
  }

  visiting.delete(packageName);
  return ids;
}

function runAudit() {
  const result = spawnSync("npm", ["audit", "--json"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (!result.stdout.trim()) {
    console.error(result.stderr.trim() || "npm audit çıktı üretmedi");
    process.exit(2);
  }

  return result.stdout;
}
