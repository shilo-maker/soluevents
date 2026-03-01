-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "assignment_status" "InvitationStatus";

-- Backfill: mark existing user-assigned tasks as confirmed (they were accepted before the invitation flow existed)
UPDATE "tasks" SET "assignment_status" = 'confirmed' WHERE "assignee_id" IS NOT NULL AND "assignment_status" IS NULL;
