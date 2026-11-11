import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";
import { copy } from "../src/lib/copy";
import { isNeonUrl, withNeonParams } from "../src/lib/db-url";
import { hashPin, pinAccepts } from "../src/lib/session";

neonConfig.webSocketConstructor = ws;

function client() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const connectionString = withNeonParams(url);
  if (isNeonUrl(connectionString)) {
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  }
  return new PrismaClient({ datasources: { db: { url: connectionString } } });
}

async function main() {
  const prisma = client();
  try {
    const existing = await prisma.salon.findFirst();
    if (existing) {
      console.log("Salon already exists; PIN unchanged");
      return;
    }
    const pin = process.env.SALON_PIN ?? "";
    if (!pinAccepts(pin)) {
      throw new Error("SALON_PIN must be 4 digits");
    }
    await prisma.salon.create({
      data: {
        pinHash: hashPin(pin),
        pinVersion: 1,
        stylists: {
          create: [
            { name: copy.columnOne, position: 0 },
            { name: copy.columnTwo, position: 1 },
          ],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
