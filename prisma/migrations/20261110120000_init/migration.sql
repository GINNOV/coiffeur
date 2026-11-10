-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stylist" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Stylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "phoneDigits" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "clientId" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "service" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stylist_salonId_position_key" ON "Stylist"("salonId", "position");

-- CreateIndex
CREATE INDEX "Client_salonId_idx" ON "Client"("salonId");

-- CreateIndex
CREATE INDEX "Appointment_stylistId_startsAt_idx" ON "Appointment"("stylistId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");

-- CreateIndex
CREATE INDEX "Appointment_salonId_startsAt_idx" ON "Appointment"("salonId", "startsAt");

-- Non-empty phone digits are unique inside one salon.
CREATE UNIQUE INDEX "Client_salon_phoneDigits_key" ON "Client"("salonId", "phoneDigits") WHERE "phoneDigits" <> '';

-- AddForeignKey
ALTER TABLE "Stylist" ADD CONSTRAINT "Stylist_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "Stylist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Half-open overlap guard for blocking visits on the same stylist.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_blocking_no_overlap"
EXCLUDE USING gist (
  "stylistId" WITH =,
  tstzrange("startsAt", "startsAt" + ("durationMinutes" * INTERVAL '1 minute'), '[)') WITH &&
) WHERE ("status" IN ('prenotato', 'in_salone', 'fatto'));
