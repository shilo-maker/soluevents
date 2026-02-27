-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'confirmed', 'declined');

-- CreateTable
CREATE TABLE "event_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "token" VARCHAR(48) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "roles_summary" JSONB NOT NULL,
    "user_id" UUID,
    "contact_id" UUID,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_invitations_token_key" ON "event_invitations"("token");
CREATE UNIQUE INDEX "event_invitations_event_id_email_key" ON "event_invitations"("event_id", "email");
CREATE INDEX "event_invitations_event_id_idx" ON "event_invitations"("event_id");
CREATE INDEX "event_invitations_token_idx" ON "event_invitations"("token");

-- AddForeignKey
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
