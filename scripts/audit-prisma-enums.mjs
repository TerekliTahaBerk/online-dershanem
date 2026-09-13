import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const schemaDirectory = new URL("../prisma/schema/", import.meta.url);
const schema = readdirSync(schemaDirectory)
  .filter((name) => name.endsWith(".prisma"))
  .sort()
  .map((name) => readFileSync(join(schemaDirectory.pathname, name), "utf8"))
  .join("\n");

function declarations(kind) {
  const matches = [...schema.matchAll(new RegExp(`^${kind}\\s+(\\w+)\\s*\\{`, "gm"))];
  return matches.map((match) => {
    let depth = 0;
    let end = match.index;
    for (; end < schema.length; end += 1) {
      if (schema[end] === "{") depth += 1;
      if (schema[end] === "}" && --depth === 0) {
        end += 1;
        break;
      }
    }
    return { name: match[1], body: schema.slice(match.index, end) };
  });
}

function enumValues(body) {
  let inBlockComment = false;
  const values = [];
  for (const rawLine of body.split("\n").slice(1, -1)) {
    let line = rawLine.trim();
    if (line.startsWith("/**") || line.startsWith("/*")) inBlockComment = true;
    if (!inBlockComment && line && !line.startsWith("//")) values.push(line.split(/\s+/)[0]);
    if (line.includes("*/")) inBlockComment = false;
  }
  return values;
}

const models = declarations("model");
const enums = declarations("enum").map((item) => ({ ...item, values: enumValues(item.body) }));
const inventory = enums.map((item) => ({
  name: item.name,
  values: item.values,
  models: models.filter((model) => new RegExp(`\\b${item.name}\\b`).test(model.body)).map((model) => model.name),
}));

const overlaps = [];
for (let left = 0; left < inventory.length; left += 1) {
  for (let right = left + 1; right < inventory.length; right += 1) {
    const a = new Set(inventory[left].values);
    const b = new Set(inventory[right].values);
    const intersection = [...a].filter((value) => b.has(value));
    const unionSize = new Set([...a, ...b]).size;
    const containment = intersection.length / Math.min(a.size, b.size);
    const jaccard = intersection.length / unionSize;
    if (intersection.length >= 2 && (jaccard >= 0.5 || containment >= 0.75)) {
      overlaps.push({ left: inventory[left].name, right: inventory[right].name, intersection, jaccard, containment });
    }
  }
}

console.log(`# Prisma enum inventory (${inventory.length})\n`);
console.log("| Enum | Values | Referencing models |");
console.log("| --- | --- | --- |");
for (const item of inventory) {
  console.log(`| ${item.name} | ${item.values.join(", ")} | ${item.models.join(", ") || "— (dead)"} |`);
}
console.log("\n## Substantially overlapping pairs\n");
console.log("| Left | Right | Shared values | Jaccard | Containment |");
console.log("| --- | --- | --- | ---: | ---: |");
for (const item of overlaps) {
  console.log(`| ${item.left} | ${item.right} | ${item.intersection.join(", ")} | ${item.jaccard.toFixed(2)} | ${item.containment.toFixed(2)} |`);
}

const dead = inventory.filter((item) => item.models.length === 0);
console.log(`\nDead enums: ${dead.length}${dead.length ? ` (${dead.map((item) => item.name).join(", ")})` : ""}`);
