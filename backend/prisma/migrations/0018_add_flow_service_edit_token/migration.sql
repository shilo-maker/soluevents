-- AlterTable (column and index already exist from direct migration)
-- This migration is a no-op to keep Prisma's migration history in sync.

-- Add editToken column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flow_services' AND column_name = 'editToken'
  ) THEN
    ALTER TABLE "flow_services" ADD COLUMN "editToken" VARCHAR(64);
  END IF;
END $$;

-- Add unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "flow_services_edit_token_unique" ON "flow_services"("editToken");
