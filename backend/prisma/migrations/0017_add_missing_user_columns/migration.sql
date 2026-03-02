-- Fix: Add SoluPlan user columns that were lost when 0001_add_soluplan
-- migration was rolled back but marked as applied via prisma migrate resolve.
-- Uses IF NOT EXISTS so this is safe to re-run.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "name_he" TEXT,
ADD COLUMN IF NOT EXISTS "name_en" TEXT,
ADD COLUMN IF NOT EXISTS "org_role" "OrgRole",
ADD COLUMN IF NOT EXISTS "avatar_url" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "smtp_host" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "smtp_port" INT,
ADD COLUMN IF NOT EXISTS "smtp_secure" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "smtp_user" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "smtp_pass" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "email_from" VARCHAR(255);

-- Also add the flow_service_id index from schema change
CREATE INDEX IF NOT EXISTS "events_flow_service_id_idx" ON "events"("flow_service_id");
