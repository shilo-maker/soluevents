-- AlterTable: Add per-workspace email/SMTP settings
ALTER TABLE "workspaces"
  ADD COLUMN "smtp_host" VARCHAR(255),
  ADD COLUMN "smtp_port" INTEGER,
  ADD COLUMN "smtp_secure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smtp_user" VARCHAR(255),
  ADD COLUMN "smtp_pass" VARCHAR(500),
  ADD COLUMN "email_from" VARCHAR(255);
