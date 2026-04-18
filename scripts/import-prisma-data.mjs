import { PrismaClient } from "@prisma/client";

const sourceUrl = process.env.SOURCE_DIRECT_URL;
const targetUrl = process.env.TARGET_DIRECT_URL;

if (!sourceUrl || !targetUrl) {
  console.error("SOURCE_DIRECT_URL and TARGET_DIRECT_URL are required.");
  process.exit(1);
}

const source = new PrismaClient({ datasourceUrl: sourceUrl });
const target = new PrismaClient({ datasourceUrl: targetUrl });

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function getTables(client) {
  return client.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);
}

async function getDependencies(client) {
  return client.$queryRawUnsafe(`
    SELECT
      tc.table_name AS child_table,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
  `);
}

async function getColumns(client, tableName) {
  return client.$queryRawUnsafe(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    tableName,
  );
}

async function getEstimatedCount(client, tableName) {
  const rows = await client.$queryRawUnsafe(
    `
      SELECT COALESCE(n_live_tup, 0)::bigint AS count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname = $1
    `,
    tableName,
  );

  return Number(rows[0]?.count ?? 0);
}

function topologicalSort(tableRows, dependencyRows) {
  const tableNames = tableRows.map((row) => row.tablename);
  const inDegree = new Map(tableNames.map((table) => [table, 0]));
  const graph = new Map(tableNames.map((table) => [table, new Set()]));

  for (const row of dependencyRows) {
    const child = row.child_table;
    const parent = row.parent_table;

    if (!graph.has(parent) || !graph.has(child) || parent === child) continue;
    if (graph.get(parent).has(child)) continue;

    graph.get(parent).add(child);
    inDegree.set(child, (inDegree.get(child) ?? 0) + 1);
  }

  const queue = tableNames.filter((table) => (inDegree.get(table) ?? 0) === 0).sort();
  const ordered = [];

  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);

    for (const next of graph.get(current) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }

  if (ordered.length !== tableNames.length) {
    const remaining = tableNames.filter((table) => !ordered.includes(table)).sort();
    ordered.push(...remaining);
  }

  return ordered;
}

function formatTypeName(typeName) {
  return /^[a-z_][a-z0-9_]*$/.test(typeName) ? typeName : quoteIdent(typeName);
}

function getCastSuffix(column) {
  if (column.data_type === "USER-DEFINED") {
    return `::${formatTypeName(column.udt_name)}`;
  }

  if (column.data_type === "json" || column.data_type === "jsonb") {
    return `::${column.data_type}`;
  }

  if (column.data_type === "ARRAY") {
    const elementType = String(column.udt_name).startsWith("_")
      ? String(column.udt_name).slice(1)
      : String(column.udt_name);

    return `::${formatTypeName(elementType)}[]`;
  }

  return "";
}

async function copyTable(tableName) {
  const sourceCount = await getEstimatedCount(source, tableName);
  const targetCount = await getEstimatedCount(target, tableName);

  if (sourceCount === 0) {
    console.log(`skip ${tableName}: source empty`);
    return;
  }

  if (targetCount > 0) {
    console.log(`skip ${tableName}: target already has ${targetCount} rows`);
    return;
  }

  const columnRows = await getColumns(source, tableName);
  const columns = columnRows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
    udtName: row.udt_name,
  }));
  const rows = await source.$queryRawUnsafe(`SELECT * FROM public.${quoteIdent(tableName)}`);

  if (rows.length === 0) {
    console.log(`skip ${tableName}: source returned 0 rows`);
    return;
  }

  const quotedColumns = columns.map((column) => quoteIdent(column.name)).join(", ");
  const batches = chunk(rows, 100);

  for (const batch of batches) {
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      const tuple = columns.map((column, columnIndex) => {
        const rawValue = row[column.name];
        const value =
          column.dataType === "json" || column.dataType === "jsonb"
            ? rawValue == null
              ? null
              : JSON.stringify(rawValue)
            : rawValue;

        values.push(value);
        return `$${rowIndex * columns.length + columnIndex + 1}${getCastSuffix({
          data_type: column.dataType,
          udt_name: column.udtName,
        })}`;
      });

      return `(${tuple.join(", ")})`;
    });

    await target.$executeRawUnsafe(
      `INSERT INTO public.${quoteIdent(tableName)} (${quotedColumns}) VALUES ${placeholders.join(", ")}`,
      ...values,
    );
  }

  console.log(`copied ${tableName}: ${rows.length} rows`);
}

async function main() {
  const [tables, dependencies] = await Promise.all([
    getTables(source),
    getDependencies(target),
  ]);

  const order = topologicalSort(tables, dependencies);
  console.log("table order:", order.join(", "));

  for (const tableName of order) {
    await copyTable(tableName);
  }

  console.log("import complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
