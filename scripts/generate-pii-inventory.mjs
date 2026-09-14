/**
 * Prisma şemasından heuristik kişisel veri envanteri üretir.
 *
 *   node scripts/generate-pii-inventory.mjs          → docs/data-classification-inventory.md yazar
 *   node scripts/generate-pii-inventory.mjs --check  → doküman şemayla güncel değilse exit 1
 *
 * Çıktı deterministiktir (zaman damgası yok) ki `--check` şema değişikliğini yakalasın.
 */
import { readFile, writeFile } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { classifyFieldName, protectionStatus } from "../lib/data-governance/pii-heuristics.mjs";
import { SENSITIVE_KEY_PARTS } from "../lib/security/redaction.mjs";

const OUTPUT = "docs/data-classification-inventory.md";
const models = Prisma.dmmf.datamodel.models;
const byName = new Map(models.map((model) => [model.name, model]));

/** Çocuk verisi: StudentProfile'a (Cascade zinciriyle) bağlı modeller. User'a bağlılar tüm rolleri kapsadığından "olası". */
function childDataIndex() {
  const index = new Map([["StudentProfile", "evet"], ["User", "olası (tüm roller)"]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const model of models) {
      if (index.get(model.name) === "evet") continue;
      for (const field of model.fields) {
        if (field.kind !== "object" || !field.relationFromFields?.length) continue;
        const parent = index.get(field.type);
        const value = parent === "evet" ? "evet" : parent ? "olası (tüm roller)" : undefined;
        if (!value || index.get(model.name) === value) continue;
        if (value === "olası (tüm roller)" && (field.type !== "User" || index.has(model.name))) continue;
        index.set(model.name, value);
        changed = true;
      }
    }
  }
  return index;
}

export function buildInventory() {
  const child = childDataIndex();
  const rows = [];
  let scalarFields = 0;
  for (const model of [...models].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const field of model.fields) {
      if (field.kind === "object") continue;
      scalarFields += 1;
      // Zaman damgası, bayrak ve FK kimliği içerik taşımaz; heuristik gürültüsünü keser.
      if (["DateTime", "Boolean"].includes(field.type) || /Ids?$/.test(field.name) || field.isId) continue;
      const isJson = field.type === "Json";
      const hit = classifyFieldName(field.name) ?? (isJson ? { category: "yapılandırılmamış (Json)", confidence: "orta" } : null);
      if (!hit) continue;
      if (field.kind === "enum" && hit.category !== "akademik") continue;
      rows.push({
        model: model.name,
        field: field.name,
        category: hit.category,
        confidence: hit.confidence,
        childData: child.get(model.name) ?? "hayır",
        protection: protectionStatus(field.name, SENSITIVE_KEY_PARTS),
      });
    }
  }
  return { rows, scalarFields, modelCount: models.length };
}

export function renderInventory({ rows, scalarFields, modelCount }) {
  const count = (key, value) => rows.filter((row) => row[key] === value).length;
  const categories = [...new Set(rows.map((row) => row.category))].sort();
  const lines = [
    "# Veri sınıflandırma envanteri (heuristik)",
    "",
    "> **Bu belge otomatik üretilmiştir ve KESİN BİR SINIFLANDIRMA DEĞİLDİR.**",
    "> Alan adlarından tahmin eden bir heuristikle (`lib/data-governance/pii-heuristics.mjs`) oluşturulur;",
    "> yanlış pozitif ve yanlış negatif içerir. Hukuk ekibi / veri sorumlusu tarafından gözden geçirilmesi",
    "> gereken bir başlangıç noktasıdır. Elle düzenlemeyin: `npm run data:pii-inventory` ile yeniden üretin.",
    "",
    "Sütunlar:",
    "",
    "- **çocuk verisi**: `evet` = `StudentProfile`'a bağlı; `olası (tüm roller)` = `User`'a bağlı (öğrenci/veli olabilir); `hayır` = kişiye doğrudan bağ bulunamadı.",
    "- **koruma**: `log/audit redaction anahtarı` yalnız log ve audit payload'larında maskelenir; veritabanında düz metindir.",
    "",
    "## Özet",
    "",
    `- Taranan model: ${modelCount}`,
    `- Taranan scalar/enum alan: ${scalarFields}`,
    `- Olası kişisel veri alanı: ${rows.length}`,
    `- Çocuk verisi \`evet\`: ${count("childData", "evet")}; \`olası\`: ${count("childData", "olası (tüm roller)")}`,
    "",
    "| Kategori | Alan sayısı |",
    "|---|---:|",
    ...categories.map((category) => `| ${category} | ${count("category", category)} |`),
    "",
    "## Alanlar",
    "",
    "| model | alan | tahmini kategori | güven | çocuk verisi | mevcut redaction/şifreleme |",
    "|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row.model} | ${row.field} | ${row.category} | ${row.confidence} | ${row.childData} | ${row.protection} |`),
    "",
  ];
  return lines.join("\n");
}

const rendered = renderInventory(buildInventory());
if (process.argv.includes("--check")) {
  const current = await readFile(OUTPUT, "utf8").catch(() => "");
  if (current !== rendered) {
    console.error(`${OUTPUT} şemayla güncel değil. Çalıştırın: npm run data:pii-inventory`);
    process.exitCode = 1;
  } else {
    console.log(`${OUTPUT} güncel.`);
  }
} else {
  await writeFile(OUTPUT, rendered);
  console.log(`${OUTPUT} yazıldı.`);
}
