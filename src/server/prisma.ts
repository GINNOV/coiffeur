import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import ws from "ws";
import { isNeonUrl, withNeonParams } from "@/lib/db-url";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const connectionString = withNeonParams(databaseUrl);
  const client = isNeonUrl(connectionString)
    ? new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
    : new PrismaClient({ datasources: { db: { url: connectionString } } });
  globalForPrisma.prisma = client;
  return client;
}
