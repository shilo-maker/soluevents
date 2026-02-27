-- Move email/SMTP settings from workspaces to users (per-user instead of per-workspace)

-- Add SMTP columns to users table
ALTER TABLE "users" ADD COLUMN "smtp_host" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "smtp_port" INTEGER;
ALTER TABLE "users" ADD COLUMN "smtp_secure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "smtp_user" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "smtp_pass" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "email_from" VARCHAR(255);

-- Remove SMTP columns from workspaces table
ALTER TABLE "workspaces" DROP COLUMN "smtp_host";
ALTER TABLE "workspaces" DROP COLUMN "smtp_port";
ALTER TABLE "workspaces" DROP COLUMN "smtp_secure";
ALTER TABLE "workspaces" DROP COLUMN "smtp_user";
ALTER TABLE "workspaces" DROP COLUMN "smtp_pass";
ALTER TABLE "workspaces" DROP COLUMN "email_from";
