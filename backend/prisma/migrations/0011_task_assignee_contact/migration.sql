-- AlterTable: Add contact assignee fields to tasks
ALTER TABLE "tasks" ADD COLUMN "assignee_contact_id" UUID;
ALTER TABLE "tasks" ADD COLUMN "assignee_is_user" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "tasks_assignee_contact_id_idx" ON "tasks"("assignee_contact_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_contact_id_fkey" FOREIGN KEY ("assignee_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
