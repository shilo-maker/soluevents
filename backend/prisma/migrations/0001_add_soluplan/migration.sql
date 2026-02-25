-- SoluPlan Migration: Add SoluPlan enums, tables, and user columns
-- This migration ONLY adds SoluPlan-specific objects.
-- It does NOT modify any existing SoluCast/SoluFlow tables.

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('admin', 'manager', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('worship', 'in_house', 'film', 'tour_child');

-- CreateEnum
CREATE TYPE "EventPhase" AS ENUM ('concept', 'prep', 'execution', 'follow_up');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('planned', 'confirmed', 'canceled', 'archived');

-- CreateEnum
CREATE TYPE "EventRole" AS ENUM ('event_manager', 'worship_lead', 'media_lead', 'logistics', 'hospitality', 'comms', 'contributor', 'guest');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('critical', 'high', 'normal');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('not_started', 'in_progress', 'waiting', 'blocked', 'done');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('event', 'tour', 'tour_day');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('event', 'task', 'tour', 'tour_day');

-- CreateEnum
CREATE TYPE "TemplateKind" AS ENUM ('event', 'tour');

-- AlterTable: Add SoluPlan columns to users
ALTER TABLE "users"
ADD COLUMN "name" TEXT,
ADD COLUMN "org_role" "OrgRole",
ADD COLUMN "avatar_url" TEXT,
ADD COLUMN "phone" TEXT;

-- CreateTable: events
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date_start" TIMESTAMP(3) NOT NULL,
    "date_end" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "location_name" TEXT,
    "address" TEXT,
    "est_attendance" INTEGER,
    "phase" "EventPhase" NOT NULL DEFAULT 'concept',
    "status" "EventStatus" NOT NULL DEFAULT 'planned',
    "parent_tour_id" UUID,
    "tags" TEXT[],
    "program_agenda" JSONB,
    "rider_details" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "flow_service_id" UUID,
    "setlist_id" UUID,
    "workspace_id" UUID,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tours
CREATE TABLE "tours" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "regions" TEXT[],
    "director_user_id" UUID,
    "logistics_user_id" UUID,
    "comms_user_id" UUID,
    "media_user_id" UUID,
    "hospitality_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tour_days
CREATE TABLE "tour_days" (
    "id" UUID NOT NULL,
    "tour_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "city" TEXT,
    "venue_name" TEXT,
    "wake_time" TEXT,
    "drive_start_time" TEXT,
    "drive_duration_minutes" INTEGER,
    "lunch_time" TEXT,
    "event_start_time" TEXT,
    "lodging_name" TEXT,
    "lodging_arrival_time" TEXT,
    "devotional_user_id" UUID,
    "is_laundry_day" BOOLEAN NOT NULL DEFAULT false,
    "is_shopping_day" BOOLEAN NOT NULL DEFAULT false,
    "linked_event_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tour_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable: role_assignments
CREATE TABLE "role_assignments" (
    "id" UUID NOT NULL,
    "event_id" UUID,
    "tour_id" UUID,
    "user_id" UUID NOT NULL,
    "role" "EventRole" NOT NULL,
    "scope" "RoleScope" NOT NULL DEFAULT 'event',
    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tasks
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
    "status" "TaskStatus" NOT NULL DEFAULT 'not_started',
    "due_at" TIMESTAMP(3),
    "link" TEXT,
    "event_id" UUID,
    "tour_id" UUID,
    "assignee_id" UUID,
    "creator_id" UUID NOT NULL,
    "parent_task_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: comments
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "mentions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: files
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "event_id" UUID,
    "tour_id" UUID,
    "uploader_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable: templates
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "kind" "TemplateKind" NOT NULL,
    "label" TEXT NOT NULL,
    "default_fields" JSONB NOT NULL,
    "default_tasks" JSONB NOT NULL,
    "default_agenda" JSONB NOT NULL,
    "default_rider" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: contacts
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: events
CREATE INDEX "events_created_by_idx" ON "events"("created_by");
CREATE INDEX "events_parent_tour_id_idx" ON "events"("parent_tour_id");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_date_start_idx" ON "events"("date_start");

-- CreateIndex: tour_days
CREATE INDEX "tour_days_tour_id_idx" ON "tour_days"("tour_id");
CREATE INDEX "tour_days_linked_event_id_idx" ON "tour_days"("linked_event_id");

-- CreateIndex: role_assignments
CREATE INDEX "role_assignments_event_id_idx" ON "role_assignments"("event_id");
CREATE INDEX "role_assignments_tour_id_idx" ON "role_assignments"("tour_id");
CREATE INDEX "role_assignments_user_id_idx" ON "role_assignments"("user_id");
CREATE UNIQUE INDEX "role_assignments_event_id_user_id_role_key" ON "role_assignments"("event_id", "user_id", "role");
CREATE UNIQUE INDEX "role_assignments_tour_id_user_id_role_key" ON "role_assignments"("tour_id", "user_id", "role");

-- CreateIndex: tasks
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX "tasks_creator_id_idx" ON "tasks"("creator_id");
CREATE INDEX "tasks_event_id_idx" ON "tasks"("event_id");
CREATE INDEX "tasks_tour_id_idx" ON "tasks"("tour_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_due_at_idx" ON "tasks"("due_at");

-- CreateIndex: comments
CREATE INDEX "comments_entity_type_entity_id_idx" ON "comments"("entity_type", "entity_id");
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex: notifications
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_read_at_idx" ON "notifications"("read_at");

-- CreateIndex: contacts
CREATE INDEX "contacts_created_by_idx" ON "contacts"("created_by");

-- AddForeignKey: events
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_parent_tour_id_fkey" FOREIGN KEY ("parent_tour_id") REFERENCES "tours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: tours
ALTER TABLE "tours" ADD CONSTRAINT "tours_director_user_id_fkey" FOREIGN KEY ("director_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tours" ADD CONSTRAINT "tours_logistics_user_id_fkey" FOREIGN KEY ("logistics_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tours" ADD CONSTRAINT "tours_comms_user_id_fkey" FOREIGN KEY ("comms_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tours" ADD CONSTRAINT "tours_media_user_id_fkey" FOREIGN KEY ("media_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tours" ADD CONSTRAINT "tours_hospitality_user_id_fkey" FOREIGN KEY ("hospitality_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: tour_days
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_devotional_user_id_fkey" FOREIGN KEY ("devotional_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_linked_event_id_fkey" FOREIGN KEY ("linked_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: role_assignments
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: tasks
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: comments
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: files
ALTER TABLE "files" ADD CONSTRAINT "files_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: notifications
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: contacts
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
