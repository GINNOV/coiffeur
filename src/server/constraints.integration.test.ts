import { describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL?.trim();

describe.skipIf(!databaseUrl)("database constraints", () => {
  it("rejects a blocking overlap and a stale updatedAt", async () => {
    const connectionString = process.env.TEST_DIRECT_URL?.trim() || databaseUrl!;
    const { PrismaClient } = await import("@prisma/client");
    const prisma = connectionString.includes("neon")
      ? new PrismaClient({
          adapter: new (await import("@prisma/adapter-neon")).PrismaNeon({ connectionString }),
        })
      : new PrismaClient({ datasources: { db: { url: connectionString } } });

    const salon = await prisma.salon.create({
      data: {
        pinHash: "scrypt$00$00",
        pinVersion: 1,
        stylists: { create: [{ name: "Poltrona 1", position: 0 }] },
      },
      include: { stylists: true },
    });
    const stylistId = salon.stylists[0].id;
    const startsAt = new Date("2026-11-10T08:00:00.000Z");
    try {
      const first = await prisma.appointment.create({
        data: {
          salonId: salon.id,
          stylistId,
          startsAt,
          durationMinutes: 60,
          service: "taglio",
          status: "prenotato",
        },
      });
      await expect(
        prisma.appointment.create({
          data: {
            salonId: salon.id,
            stylistId,
            startsAt: new Date("2026-11-10T08:30:00.000Z"),
            durationMinutes: 30,
            service: "piega",
            status: "fatto",
          },
        }),
      ).rejects.toThrow(/23P01|exclusion/i);

      const stale = await prisma.appointment.updateMany({
        where: { id: first.id, updatedAt: new Date("2000-01-01T00:00:00.000Z") },
        data: { service: "colore" },
      });
      expect(stale.count).toBe(0);
      const kept = await prisma.appointment.findUniqueOrThrow({ where: { id: first.id } });
      expect(kept.service).toBe("taglio");
    } finally {
      await prisma.appointment.deleteMany({ where: { salonId: salon.id } });
      await prisma.stylist.deleteMany({ where: { salonId: salon.id } });
      await prisma.salon.delete({ where: { id: salon.id } });
      await prisma.$disconnect();
    }
  });
});

