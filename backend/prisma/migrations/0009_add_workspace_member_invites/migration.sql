-- CreateTable
CREATE TABLE "workspace_member_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "invited_email" VARCHAR(255) NOT NULL,
    "invited_user_id" UUID,
    "role" "enum_workspace_members_role" NOT NULL DEFAULT 'member',
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "token" VARCHAR(128) NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "workspace_member_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_member_invites_token_key" ON "workspace_member_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_member_invites_workspace_id_invited_email_key" ON "workspace_member_invites"("workspace_id", "invited_email");

-- CreateIndex
CREATE INDEX "workspace_member_invites_workspace_id_idx" ON "workspace_member_invites"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_member_invites_invited_by_id_idx" ON "workspace_member_invites"("invited_by_id");

-- CreateIndex
CREATE INDEX "workspace_member_invites_token_idx" ON "workspace_member_invites"("token");

-- AddForeignKey
ALTER TABLE "workspace_member_invites" ADD CONSTRAINT "workspace_member_invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_member_invites" ADD CONSTRAINT "workspace_member_invites_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_member_invites" ADD CONSTRAINT "workspace_member_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
