import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY.",
  );
}

const response = await fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
});

if (!response.ok) {
  throw new Error(
    `Could not load schema metadata: ${response.status} ${response.statusText}`,
  );
}

const schema = await response.json();
const definitions = schema.definitions ?? {};

for (const [tableName, definition] of Object.entries(definitions)) {
  const columns = Object.entries(definition.properties ?? {})
    .map(([columnName, column]) => {
      const type = column.format ?? column.type ?? "unknown";
      const enumValues = column.enum?.length
        ? ` (${column.enum.join("|")})`
        : "";

      return `${columnName}${definition.required?.includes(columnName) ? " *" : ""}: ${type}${enumValues}`;
    })
    .join(", ");

  console.log(`${tableName}: ${columns}`);
}
