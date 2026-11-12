ALTER TABLE "Salon" ADD COLUMN "closedWeekdays" INTEGER[] NOT NULL DEFAULT ARRAY[0, 1]::INTEGER[];
ALTER TABLE "Salon" ADD COLUMN "closedDates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KapsoSetting" (
    "salonId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL DEFAULT '',
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "displayPhoneNumber" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "KapsoSetting_pkey" PRIMARY KEY ("salonId")
);

CREATE INDEX "Service_salonId_idx" ON "Service"("salonId");
CREATE UNIQUE INDEX "MessageTemplate_salonId_key_key" ON "MessageTemplate"("salonId", "key");

ALTER TABLE "Service" ADD CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KapsoSetting" ADD CONSTRAINT "KapsoSetting_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
