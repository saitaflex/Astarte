// Applies supabase/migrations/*.sql in order, once each, inside a transaction per file.
// Usage: node --env-file=.env.local scripts/db-migrate.mjs [--demo] [--demo-clear]
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error("POSTGRES_URL_NON_POOLING is not set (run with --env-file=.env.local)");

const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]+/, ""), ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())");
await client.query("alter table public._migrations enable row level security");

const dir = path.resolve("supabase/migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const done = new Set((await client.query("select name from public._migrations")).rows.map((r) => r.name));

async function apply(name, sql) {
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query("insert into public._migrations (name) values ($1)", [name]);
    await client.query("commit");
    console.log("applied", name);
  } catch (err) {
    await client.query("rollback");
    console.error("FAILED", name, "-", err.message);
    process.exitCode = 1;
    throw err;
  }
}

try {
  for (const f of files) if (!done.has(f)) await apply(f, await readFile(path.join(dir, f), "utf8"));
  if (process.argv.includes("--demo-clear")) {
    await client.query("delete from public.artist_profiles where is_demo");
    console.log("demo content removed");
  }
  if (process.argv.includes("--demo") && !done.has("seed:demo")) {
    await apply("seed:demo", await readFile(path.resolve("supabase/seed/demo.sql"), "utf8"));
  }
  console.log("database up to date");
} finally {
  await client.end();
}
