-- CreateTable: venues
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add venue_id to events
ALTER TABLE "events" ADD COLUMN "venue_id" UUID;

-- CreateIndex: venues
CREATE INDEX "venues_created_by_idx" ON "venues"("created_by");
CREATE INDEX "venues_name_idx" ON "venues"("name");

-- CreateIndex: events
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");

-- AddForeignKey: venues
ALTER TABLE "venues" ADD CONSTRAINT "venues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: events -> venues
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
