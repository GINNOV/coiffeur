import { readFileSync, existsSync } from "node:fs";
import { defineConfig } from "prisma/config";
import { withNeonParams } from "./src/lib/db-url";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env");

const fallback = "postgresql://prisma:prisma@127.0.0.1:5432/coiffeur";
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = fallback;
if (!process.env.DIRECT_URL) process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.DATABASE_URL = withNeonParams(process.env.DATABASE_URL);
process.env.DIRECT_URL = withNeonParams(process.env.DIRECT_URL);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
    directUrl: process.env.DIRECT_URL,
  },
});
