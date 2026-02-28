-- CreateTable
CREATE TABLE "sent_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(10) NOT NULL,
    "entity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reminder_key" VARCHAR(20) NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sent_reminders_entity_type_entity_id_user_id_reminder_key_key"
    ON "sent_reminders"("entity_type", "entity_id", "user_id", "reminder_key");

-- CreateIndex
CREATE INDEX "sent_reminders_sent_at_idx" ON "sent_reminders"("sent_at");

-- AddForeignKey
ALTER TABLE "sent_reminders"
    ADD CONSTRAINT "sent_reminders_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
