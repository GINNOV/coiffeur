ALTER TABLE "Client" ADD COLUMN "likes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Appointment" ADD COLUMN "request" TEXT NOT NULL DEFAULT '';

CREATE TABLE "VisitPhoto" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VisitPhoto_appointmentId_kind_key" ON "VisitPhoto"("appointmentId", "kind");

ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
