-- AlterTable
ALTER TABLE "files" ADD COLUMN "file_type" TEXT NOT NULL DEFAULT 'link';
ALTER TABLE "files" ADD COLUMN "file_size" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "files" ADD COLUMN "mime_type" TEXT;
ALTER TABLE "files" ADD COLUMN "category" TEXT;
ALTER TABLE "files" ADD COLUMN "expired_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "files_event_id_idx" ON "files"("event_id");
CREATE INDEX "files_uploader_id_idx" ON "files"("uploader_id");
