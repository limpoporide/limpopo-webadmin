import { createClient } from "@supabase/supabase-js";
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
      .replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const [{ data: rows, error: rowsError }, { data: buckets, error: bucketsError }] =
  await Promise.all([
    supabase
      .from("driver_profile")
      .select("uuid, license_upload")
      .not("license_upload", "is", null)
      .limit(5),
    supabase.storage.listBuckets(),
  ]);

if (rowsError) {
  throw rowsError;
}

if (bucketsError) {
  throw bucketsError;
}

console.log("License upload samples:");
console.log(JSON.stringify(rows, null, 2));
console.log("Storage buckets:");
console.log(buckets.map((bucket) => bucket.name).join("\n"));