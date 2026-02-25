-- CreateEnum
CREATE TYPE "enum_bible_verses_testament" AS ENUM ('old', 'new');

-- CreateEnum
CREATE TYPE "enum_flow_service_songs_segmentType" AS ENUM ('song', 'prayer', 'reading', 'break');

-- CreateEnum
CREATE TYPE "enum_media_type" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "enum_remote_screens_displayType" AS ENUM ('viewer', 'stage', 'obs', 'custom');

-- CreateEnum
CREATE TYPE "enum_song_reports_status" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "enum_songs_approvalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "enum_songs_originalLanguage" AS ENUM ('he', 'en', 'es', 'fr', 'de', 'ru', 'ar', 'other');

-- CreateEnum
CREATE TYPE "enum_users_authProvider" AS ENUM ('local', 'google');

-- CreateEnum
CREATE TYPE "enum_users_role" AS ENUM ('operator', 'admin');

-- CreateEnum
CREATE TYPE "enum_workspace_members_role" AS ENUM ('admin', 'planner', 'leader', 'member');

-- CreateEnum
CREATE TYPE "enum_workspaces_workspaceType" AS ENUM ('personal', 'organization');

-- CreateTable
CREATE TABLE "SongMappings" (
    "id" SERIAL NOT NULL,
    "soluflowId" INTEGER NOT NULL,
    "soluflowTitle" VARCHAR(255) NOT NULL,
    "solupresenterId" UUID,
    "solupresenterTitle" VARCHAR(255),
    "confidence" DOUBLE PRECISION,
    "manuallyLinked" BOOLEAN DEFAULT false,
    "noMatch" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SongMappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bible_verses" (
    "id" UUID NOT NULL,
    "book" VARCHAR(255) NOT NULL,
    "bookNumber" INTEGER NOT NULL,
    "testament" "enum_bible_verses_testament" NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "hebrewText" TEXT DEFAULT '',
    "englishText" TEXT DEFAULT '',
    "reference" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bible_verses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_notes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "serviceId" UUID,
    "content" JSON DEFAULT '{}',
    "isVisible" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flow_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_service_songs" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "songId" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "segmentType" "enum_flow_service_songs_segmentType" NOT NULL DEFAULT 'song',
    "segmentTitle" VARCHAR(255),
    "segmentContent" TEXT,
    "notes" TEXT,
    "transposition" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flow_service_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_services" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "date" DATE,
    "time" VARCHAR(10),
    "location" VARCHAR(255),
    "leaderId" UUID,
    "createdById" UUID NOT NULL,
    "code" VARCHAR(8),
    "isPublic" BOOLEAN DEFAULT false,
    "isArchived" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flow_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_song_tags" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "flow_song_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "color" VARCHAR(20),
    "isPublic" BOOLEAN DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "flow_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "enum_media_type" NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "thumbnailUrl" VARCHAR(255) DEFAULT '',
    "isPublic" BOOLEAN DEFAULT false,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "fileSize" INTEGER,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentations" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slides" JSONB NOT NULL DEFAULT '[]',
    "createdById" UUID,
    "isPublic" BOOLEAN DEFAULT false,
    "canvasDimensions" JSONB NOT NULL DEFAULT '{"width": 1920, "height": 1080}',
    "backgroundSettings" JSONB NOT NULL DEFAULT '{"type": "color", "value": "#000000"}',
    "usageCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "quickModeData" JSONB,

    CONSTRAINT "presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_rooms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "ownerId" UUID NOT NULL,
    "activeRoomId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "public_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remote_screens" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "displayType" "enum_remote_screens_displayType" NOT NULL DEFAULT 'viewer',
    "config" JSON DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "remote_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "pin" VARCHAR(4) NOT NULL,
    "operatorId" UUID NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "currentSlide" JSONB DEFAULT '{"songId": null, "isBlank": false, "slideIndex": 0, "displayMode": "bilingual"}',
    "currentImageUrl" VARCHAR(255),
    "currentBibleData" JSONB,
    "backgroundImage" VARCHAR(255) DEFAULT '',
    "quickSlideText" VARCHAR(255) DEFAULT '',
    "viewerCount" INTEGER DEFAULT 0,
    "temporarySetlistId" UUID,
    "linkedPermanentSetlistId" UUID,
    "lastActivity" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "activeThemeId" UUID,
    "currentPresentationData" JSONB,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setlists" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdById" UUID NOT NULL,
    "isTemporary" BOOLEAN DEFAULT false,
    "linkedRoomId" UUID,
    "usageCount" INTEGER DEFAULT 0,
    "shareToken" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "flowServiceId" UUID,
    "shareCode" VARCHAR(20),

    CONSTRAINT "setlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_services" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sharedAt" TIMESTAMPTZ(6),

    CONSTRAINT "shared_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_songs" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sharedById" UUID,
    "sharedAt" TIMESTAMPTZ(6),

    CONSTRAINT "shared_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_mappings" (
    "id" UUID NOT NULL,
    "soluflowId" INTEGER NOT NULL,
    "soluflowTitle" VARCHAR(255) NOT NULL,
    "solupresenterId" UUID,
    "solupresenterTitle" VARCHAR(255),
    "confidence" INTEGER,
    "manuallyLinked" BOOLEAN DEFAULT false,
    "noMatch" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "song_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_reports" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "reporterEmail" VARCHAR(255) NOT NULL,
    "reportType" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" "enum_song_reports_status" NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "reviewedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "song_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_workspaces" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,

    CONSTRAINT "song_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "originalLanguage" "enum_songs_originalLanguage" DEFAULT 'he',
    "slides" JSONB NOT NULL DEFAULT '[]',
    "tags" JSON DEFAULT '[]',
    "isPublic" BOOLEAN DEFAULT false,
    "isPendingApproval" BOOLEAN DEFAULT false,
    "createdById" UUID,
    "usageCount" INTEGER DEFAULT 0,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "backgroundImage" VARCHAR(255) DEFAULT '',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "author" VARCHAR(255),
    "chordProContent" TEXT,
    "musicalKey" VARCHAR(10),
    "bpm" INTEGER,
    "timeSignature" VARCHAR(10),
    "authors" VARCHAR(255),
    "copyrightInfo" TEXT,
    "listenUrl" VARCHAR(500),
    "songCode" VARCHAR(20),
    "approvalStatus" "enum_songs_approvalStatus",
    "workspaceId" UUID,
    "soluflowLegacyId" INTEGER,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sso_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_monitor_themes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdById" UUID,
    "isBuiltIn" BOOLEAN DEFAULT false,
    "canvasDimensions" JSON DEFAULT '{"width":1920,"height":1080}',
    "colors" JSON DEFAULT '{"background":"#0a0a0a","text":"#ffffff","accent":"#4a90d9","secondary":"#888888","border":"#333333"}',
    "header" JSON DEFAULT '{"visible":true,"x":0,"y":0,"width":100,"height":8,"backgroundColor":"transparent","borderWidth":1,"borderColor":"#333333"}',
    "clock" JSON DEFAULT '{"visible":true,"x":85,"y":1,"width":13,"height":6,"fontSize":100,"fontWeight":"bold","color":"#ffffff","fontFamily":"monospace"}',
    "songTitle" JSON DEFAULT '{"visible":true,"x":2,"y":1,"width":60,"height":6,"fontSize":100,"fontWeight":"600","color":"#4a90d9"}',
    "currentSlideArea" JSON DEFAULT '{"x":2,"y":12,"width":64,"height":84,"backgroundColor":"rgba(255,255,255,0.03)","borderRadius":12,"borderWidth":1,"borderColor":"#333333","padding":2}',
    "currentSlideText" JSON DEFAULT '{"original":{"visible":true,"fontSize":100,"fontWeight":"bold","color":"#ffffff","opacity":1},"transliteration":{"visible":true,"fontSize":80,"fontWeight":"400","color":"#888888","opacity":1},"translation":{"visible":true,"fontSize":80,"fontWeight":"400","color":"#ffffff","opacity":0.9}}',
    "nextSlideArea" JSON DEFAULT '{"visible":true,"x":68,"y":12,"width":30,"height":84,"backgroundColor":"#1a1a1a","borderRadius":8,"borderWidth":1,"borderColor":"#333333","opacity":0.8,"labelText":"Next","labelColor":"#888888","labelFontSize":90}',
    "backgroundBoxes" JSON DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stage_monitor_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "authProvider" "enum_users_authProvider" NOT NULL DEFAULT 'local',
    "googleId" VARCHAR(255),
    "role" "enum_users_role" NOT NULL DEFAULT 'operator',
    "preferences" JSONB DEFAULT '{"language": "he"}',
    "activeRoomId" UUID,
    "isEmailVerified" BOOLEAN DEFAULT false,
    "emailVerificationToken" VARCHAR(255),
    "emailVerificationExpires" TIMESTAMPTZ(6),
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMPTZ(6),
    "username" VARCHAR(100),
    "isActive" BOOLEAN DEFAULT true,
    "activeWorkspaceId" UUID,
    "defaultWorkspaceId" UUID,
    "soluflowLegacyId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_themes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdById" UUID,
    "isBuiltIn" BOOLEAN DEFAULT false,
    "lineOrder" JSON DEFAULT '["original","transliteration","translation"]',
    "lineStyles" JSON DEFAULT '{"original":{"fontSize":100,"fontWeight":"500","color":"#FFFFFF","opacity":1,"visible":true},"transliteration":{"fontSize":90,"fontWeight":"400","color":"#FFFFFF","opacity":0.95,"visible":true},"translation":{"fontSize":90,"fontWeight":"400","color":"#FFFFFF","opacity":0.95,"visible":true}}',
    "positioning" JSON DEFAULT '{"vertical":"center","horizontal":"center","customTop":null,"customLeft":null}',
    "container" JSON DEFAULT '{"maxWidth":"100%","padding":"2vh 6vw","backgroundColor":"transparent","borderRadius":"0px"}',
    "viewerBackground" JSON DEFAULT '{"type":"inherit","color":null}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "linePositions" JSON,
    "canvasDimensions" JSON DEFAULT '{"width":1920,"height":1080}',
    "backgroundBoxes" JSON DEFAULT '[]',

    CONSTRAINT "viewer_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(6),
    "usageCount" INTEGER DEFAULT 0,
    "maxUses" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "enum_workspace_members_role" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "workspaceType" "enum_workspaces_workspaceType" NOT NULL DEFAULT 'personal',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SongMappings_soluflowId_key" ON "SongMappings"("soluflowId" ASC);

-- CreateIndex
CREATE INDEX "bible_verses_book" ON "bible_verses"("book" ASC);

-- CreateIndex
CREATE INDEX "bible_verses_book_chapter_verse" ON "bible_verses"("book" ASC, "chapter" ASC, "verse" ASC);

-- CreateIndex
CREATE INDEX "bible_verses_chapter" ON "bible_verses"("chapter" ASC);

-- CreateIndex
CREATE INDEX "bible_verses_reference" ON "bible_verses"("reference" ASC);

-- CreateIndex
CREATE INDEX "bible_verses_testament" ON "bible_verses"("testament" ASC);

-- CreateIndex
CREATE INDEX "bible_verses_testament_book_number_chapter_verse" ON "bible_verses"("testament" ASC, "bookNumber" ASC, "chapter" ASC, "verse" ASC);

-- CreateIndex
CREATE INDEX "flow_notes_service_id" ON "flow_notes"("serviceId" ASC);

-- CreateIndex
CREATE INDEX "flow_notes_song_id" ON "flow_notes"("songId" ASC);

-- CreateIndex
CREATE INDEX "flow_notes_user_id" ON "flow_notes"("userId" ASC);

-- CreateIndex
CREATE INDEX "flow_service_songs_service_id" ON "flow_service_songs"("serviceId" ASC);

-- CreateIndex
CREATE INDEX "flow_service_songs_service_id_position" ON "flow_service_songs"("serviceId" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "flow_service_songs_song_id" ON "flow_service_songs"("songId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "flow_services_code" ON "flow_services"("code" ASC);

-- CreateIndex
CREATE INDEX "flow_services_created_by_id" ON "flow_services"("createdById" ASC);

-- CreateIndex
CREATE INDEX "flow_services_date" ON "flow_services"("date" ASC);

-- CreateIndex
CREATE INDEX "flow_services_is_archived" ON "flow_services"("isArchived" ASC);

-- CreateIndex
CREATE INDEX "flow_services_leader_id" ON "flow_services"("leaderId" ASC);

-- CreateIndex
CREATE INDEX "flow_services_workspace_id" ON "flow_services"("workspaceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "flow_song_tags_songId_tagId_key" ON "flow_song_tags"("songId" ASC, "tagId" ASC);

-- CreateIndex
CREATE INDEX "flow_song_tags_song_id" ON "flow_song_tags"("songId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "flow_song_tags_song_id_tag_id" ON "flow_song_tags"("songId" ASC, "tagId" ASC);

-- CreateIndex
CREATE INDEX "flow_song_tags_tag_id" ON "flow_song_tags"("tagId" ASC);

-- CreateIndex
CREATE INDEX "flow_tags_created_by_id" ON "flow_tags"("createdById" ASC);

-- CreateIndex
CREATE INDEX "flow_tags_is_public" ON "flow_tags"("isPublic" ASC);

-- CreateIndex
CREATE INDEX "flow_tags_name" ON "flow_tags"("name" ASC);

-- CreateIndex
CREATE INDEX "media_is_public_uploaded_by_id" ON "media"("isPublic" ASC, "uploadedById" ASC);

-- CreateIndex
CREATE INDEX "media_name" ON "media"("name" ASC);

-- CreateIndex
CREATE INDEX "media_uploaded_by_id" ON "media"("uploadedById" ASC);

-- CreateIndex
CREATE INDEX "presentations_created_by_id" ON "presentations"("createdById" ASC);

-- CreateIndex
CREATE INDEX "presentations_is_public_created_by_id" ON "presentations"("isPublic" ASC, "createdById" ASC);

-- CreateIndex
CREATE INDEX "presentations_title" ON "presentations"("title" ASC);

-- CreateIndex
CREATE INDEX "presentations_updated_at" ON "presentations"("updatedAt" ASC);

-- CreateIndex
CREATE INDEX "public_rooms_active_room_id" ON "public_rooms"("activeRoomId" ASC);

-- CreateIndex
CREATE INDEX "public_rooms_owner_id" ON "public_rooms"("ownerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key1" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key10" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key100" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key101" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key102" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key103" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key104" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key105" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key106" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key107" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key108" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key109" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key11" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key110" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key111" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key112" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key113" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key114" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key115" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key116" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key117" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key118" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key119" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key12" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key120" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key121" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key122" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key123" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key124" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key125" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key126" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key127" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key128" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key129" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key13" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key130" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key131" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key132" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key133" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key134" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key135" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key136" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key137" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key138" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key139" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key14" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key140" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key141" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key142" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key143" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key144" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key145" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key146" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key147" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key148" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key149" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key15" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key150" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key151" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key152" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key153" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key154" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key155" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key156" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key157" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key158" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key159" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key16" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key160" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key161" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key162" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key163" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key164" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key165" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key166" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key167" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key168" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key169" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key17" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key170" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key171" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key172" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key173" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key174" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key175" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key176" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key177" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key178" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key179" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key18" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key180" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key181" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key182" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key183" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key184" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key185" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key186" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key187" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key188" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key189" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key19" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key190" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key191" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key192" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key193" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key194" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key195" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key196" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key197" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key198" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key199" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key2" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key20" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key200" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key201" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key202" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key203" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key204" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key205" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key206" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key207" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key208" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key209" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key21" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key210" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key211" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key212" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key213" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key214" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key215" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key216" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key217" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key218" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key219" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key22" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key220" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key221" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key222" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key223" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key224" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key225" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key226" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key227" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key228" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key229" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key23" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key230" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key231" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key232" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key233" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key234" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key235" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key236" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key237" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key238" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key239" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key24" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key240" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key241" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key242" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key243" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key244" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key245" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key246" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key247" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key248" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key249" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key25" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key250" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key251" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key252" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key253" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key254" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key255" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key256" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key257" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key258" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key259" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key26" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key260" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key261" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key262" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key263" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key264" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key265" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key266" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key267" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key268" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key269" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key27" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key270" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key271" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key272" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key273" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key274" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key275" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key276" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key277" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key278" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key279" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key28" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key280" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key281" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key282" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key283" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key284" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key285" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key286" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key287" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key288" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key289" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key29" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key290" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key291" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key292" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key293" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key294" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key295" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key296" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key297" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key298" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key299" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key3" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key30" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key300" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key301" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key302" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key303" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key304" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key305" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key306" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key307" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key308" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key309" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key31" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key310" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key311" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key312" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key313" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key314" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key315" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key316" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key317" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key318" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key319" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key32" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key320" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key321" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key322" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key323" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key324" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key325" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key326" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key327" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key328" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key329" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key33" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key330" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key331" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key332" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key333" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key334" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key335" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key336" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key337" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key338" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key339" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key34" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key340" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key341" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key342" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key343" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key344" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key345" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key346" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key347" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key348" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key349" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key35" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key350" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key351" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key352" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key353" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key354" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key355" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key356" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key357" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key358" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key359" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key36" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key360" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key361" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key362" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key363" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key364" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key365" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key366" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key367" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key368" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key369" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key37" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key370" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key371" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key372" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key373" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key374" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key375" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key376" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key377" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key378" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key379" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key38" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key380" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key381" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key382" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key383" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key384" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key385" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key386" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key387" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key388" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key389" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key39" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key390" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key391" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key392" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key393" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key394" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key395" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key396" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key397" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key398" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key399" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key4" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key40" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key400" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key401" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key402" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key403" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key404" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key405" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key406" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key407" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key408" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key409" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key41" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key410" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key411" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key412" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key413" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key414" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key415" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key416" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key417" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key418" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key419" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key42" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key420" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key421" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key422" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key423" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key424" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key425" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key426" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key427" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key428" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key429" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key43" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key430" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key431" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key432" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key433" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key434" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key435" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key436" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key437" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key438" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key439" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key44" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key440" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key441" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key442" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key443" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key444" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key445" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key446" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key447" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key448" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key449" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key45" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key450" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key451" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key452" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key453" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key454" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key455" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key456" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key457" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key458" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key459" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key46" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key460" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key461" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key462" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key463" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key464" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key465" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key466" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key467" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key468" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key469" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key47" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key470" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key471" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key472" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key473" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key474" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key475" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key476" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key477" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key478" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key479" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key48" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key480" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key481" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key482" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key483" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key484" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key485" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key486" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key487" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key488" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key489" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key49" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key490" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key491" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key492" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key493" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key494" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key495" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key496" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key497" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key498" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key499" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key5" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key50" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key500" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key501" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key502" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key503" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key504" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key505" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key506" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key507" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key508" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key509" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key51" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key510" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key511" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key512" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key513" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key514" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key515" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key516" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key517" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key518" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key519" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key52" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key520" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key521" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key522" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key523" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key524" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key525" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key526" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key527" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key528" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key529" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key53" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key530" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key531" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key532" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key533" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key534" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key535" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key536" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key537" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key538" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key539" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key54" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key540" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key541" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key542" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key543" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key544" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key545" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key546" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key547" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key548" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key549" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key55" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key550" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key551" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key552" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key553" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key554" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key555" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key556" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key557" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key558" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key559" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key56" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key560" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key561" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key562" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key563" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key564" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key565" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key566" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key567" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key568" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key569" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key57" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key570" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key571" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key572" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key573" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key574" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key575" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key576" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key577" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key578" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key579" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key58" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key580" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key581" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key582" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key583" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key584" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key585" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key586" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key587" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key588" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key589" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key59" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key590" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key591" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key592" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key593" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key594" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key595" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key596" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key597" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key598" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key599" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key6" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key60" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key600" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key601" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key602" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key603" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key604" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key605" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key606" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key607" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key608" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key609" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key61" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key610" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key611" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key612" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key613" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key614" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key615" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key616" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key617" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key618" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key619" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key62" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key620" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key621" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key622" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key623" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key624" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key625" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key626" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key627" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key628" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key629" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key63" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key630" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key631" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key632" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key633" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key634" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key635" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key636" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key637" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key638" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key639" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key64" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key640" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key641" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key642" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key643" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key644" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key645" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key646" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key647" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key648" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key649" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key65" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key650" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key651" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key652" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key653" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key654" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key655" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key656" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key657" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key658" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key659" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key66" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key660" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key661" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key662" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key663" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key664" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key665" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key666" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key667" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key668" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key669" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key67" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key670" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key671" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key672" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key673" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key674" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key675" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key676" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key677" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key678" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key679" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key68" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key680" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key681" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key682" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key683" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key684" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key685" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key686" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key687" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key688" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key689" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key69" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key690" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key691" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key692" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key693" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key694" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key695" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key696" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key697" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key698" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key699" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key7" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key70" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key700" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key701" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key702" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key703" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key704" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key705" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key706" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key707" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key708" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key709" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key71" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key710" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key711" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key712" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key713" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key714" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key715" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key716" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key717" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key718" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key719" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key72" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key720" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key721" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key722" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key723" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key724" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key725" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key726" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key727" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key728" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key729" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key73" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key730" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key731" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key732" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key733" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key734" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key735" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key736" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key737" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key738" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key739" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key74" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key740" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key741" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key742" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key743" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key744" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key745" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key746" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key747" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key748" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key749" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key75" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key750" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key751" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key752" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key753" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key754" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key755" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key756" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key757" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key758" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key759" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key76" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key760" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key761" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key762" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key763" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key764" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key765" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key766" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key767" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key768" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key769" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key77" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key770" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key771" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key772" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key773" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key774" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key775" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key776" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key777" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key778" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key78" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key79" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key8" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key80" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key81" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key82" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key83" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key84" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key85" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key86" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key87" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key88" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key89" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key9" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key90" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key91" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key92" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key93" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key94" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key95" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key96" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key97" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key98" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "public_rooms_slug_key99" ON "public_rooms"("slug" ASC);

-- CreateIndex
CREATE INDEX "remote_screens_user_id" ON "remote_screens"("userId" ASC);

-- CreateIndex
CREATE INDEX "rooms_expires_at" ON "rooms"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "rooms_is_active" ON "rooms"("isActive" ASC);

-- CreateIndex
CREATE INDEX "rooms_last_activity" ON "rooms"("lastActivity" ASC);

-- CreateIndex
CREATE INDEX "rooms_operator_id" ON "rooms"("operatorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE INDEX "rooms_pin_is_active" ON "rooms"("pin" ASC, "isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key1" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key10" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key100" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key101" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key102" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key103" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key104" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key105" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key106" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key107" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key108" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key109" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key11" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key110" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key111" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key112" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key113" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key114" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key115" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key116" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key117" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key118" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key119" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key12" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key120" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key121" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key122" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key123" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key124" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key125" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key126" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key127" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key128" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key129" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key13" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key130" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key131" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key132" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key133" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key134" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key135" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key136" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key137" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key138" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key139" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key14" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key140" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key141" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key142" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key143" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key144" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key145" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key146" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key147" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key148" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key149" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key15" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key150" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key151" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key152" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key153" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key154" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key155" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key156" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key157" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key158" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key159" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key16" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key160" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key161" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key162" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key163" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key164" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key165" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key166" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key167" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key168" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key169" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key17" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key170" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key171" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key172" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key173" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key174" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key175" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key176" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key177" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key178" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key179" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key18" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key180" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key181" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key182" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key183" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key184" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key185" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key186" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key187" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key188" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key189" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key19" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key190" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key191" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key192" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key193" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key194" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key195" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key196" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key197" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key198" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key199" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key2" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key20" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key200" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key201" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key202" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key203" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key204" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key205" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key206" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key207" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key208" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key209" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key21" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key210" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key211" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key212" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key213" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key214" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key215" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key216" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key217" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key218" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key219" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key22" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key220" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key221" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key222" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key223" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key224" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key225" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key226" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key227" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key228" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key229" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key23" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key230" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key231" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key232" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key233" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key234" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key235" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key236" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key237" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key238" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key239" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key24" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key240" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key241" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key242" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key243" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key244" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key245" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key246" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key247" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key248" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key249" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key25" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key250" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key251" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key252" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key253" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key254" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key255" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key256" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key257" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key258" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key259" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key26" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key260" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key261" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key262" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key263" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key264" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key265" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key266" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key267" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key268" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key269" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key27" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key270" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key271" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key272" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key273" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key274" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key275" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key276" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key277" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key278" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key279" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key28" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key280" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key281" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key282" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key283" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key284" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key285" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key286" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key287" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key288" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key289" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key29" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key290" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key291" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key292" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key293" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key294" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key295" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key296" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key297" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key298" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key299" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key3" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key30" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key300" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key301" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key302" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key303" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key304" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key305" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key306" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key307" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key308" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key309" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key31" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key310" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key311" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key312" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key313" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key314" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key315" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key316" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key317" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key318" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key319" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key32" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key320" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key321" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key322" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key323" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key324" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key325" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key326" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key327" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key328" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key329" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key33" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key330" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key331" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key332" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key333" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key334" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key335" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key336" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key337" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key338" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key339" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key34" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key340" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key341" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key342" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key343" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key344" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key345" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key346" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key347" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key348" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key349" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key35" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key350" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key351" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key352" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key353" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key354" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key355" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key356" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key357" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key358" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key359" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key36" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key360" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key361" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key362" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key363" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key364" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key365" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key366" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key367" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key368" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key369" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key37" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key370" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key371" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key372" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key373" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key374" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key375" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key376" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key377" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key378" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key379" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key38" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key380" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key381" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key382" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key383" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key384" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key385" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key386" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key387" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key388" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key389" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key39" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key390" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key391" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key392" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key393" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key394" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key395" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key396" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key397" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key398" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key399" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key4" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key40" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key400" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key401" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key402" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key403" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key404" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key405" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key406" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key407" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key408" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key409" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key41" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key410" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key411" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key412" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key413" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key414" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key415" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key416" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key417" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key418" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key419" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key42" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key420" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key421" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key422" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key423" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key424" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key425" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key426" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key427" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key428" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key429" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key43" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key430" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key431" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key432" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key433" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key434" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key435" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key436" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key437" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key438" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key439" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key44" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key440" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key441" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key442" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key443" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key444" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key445" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key446" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key447" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key448" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key449" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key45" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key450" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key451" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key452" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key453" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key454" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key455" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key456" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key457" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key458" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key459" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key46" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key460" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key461" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key462" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key463" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key464" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key465" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key466" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key467" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key468" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key469" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key47" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key470" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key471" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key472" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key473" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key474" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key475" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key476" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key477" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key478" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key479" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key48" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key480" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key481" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key482" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key483" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key484" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key485" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key486" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key487" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key488" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key489" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key49" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key490" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key491" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key492" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key493" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key494" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key495" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key496" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key497" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key498" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key499" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key5" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key50" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key500" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key501" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key502" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key503" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key504" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key505" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key506" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key507" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key508" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key509" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key51" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key510" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key511" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key512" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key513" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key514" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key515" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key516" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key517" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key518" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key519" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key52" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key520" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key521" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key522" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key523" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key524" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key525" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key526" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key527" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key528" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key529" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key53" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key530" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key531" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key532" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key533" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key534" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key535" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key536" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key537" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key538" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key539" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key54" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key540" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key541" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key542" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key543" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key544" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key545" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key546" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key547" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key548" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key549" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key55" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key550" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key551" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key552" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key553" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key554" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key555" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key556" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key557" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key558" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key559" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key56" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key560" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key561" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key562" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key563" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key564" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key565" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key566" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key567" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key568" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key569" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key57" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key570" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key571" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key572" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key573" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key574" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key575" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key576" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key577" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key578" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key579" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key58" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key580" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key581" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key582" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key583" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key584" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key585" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key586" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key587" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key588" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key589" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key59" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key590" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key591" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key592" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key593" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key594" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key595" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key596" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key597" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key598" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key599" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key6" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key60" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key600" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key601" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key602" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key603" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key604" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key605" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key606" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key607" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key608" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key609" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key61" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key610" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key611" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key612" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key613" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key614" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key615" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key616" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key617" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key618" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key619" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key62" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key620" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key621" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key622" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key623" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key624" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key625" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key626" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key627" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key628" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key629" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key63" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key630" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key631" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key632" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key633" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key634" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key635" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key636" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key637" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key638" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key639" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key64" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key640" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key641" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key642" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key643" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key644" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key645" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key646" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key647" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key648" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key649" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key65" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key650" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key651" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key652" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key653" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key654" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key655" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key656" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key657" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key658" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key659" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key66" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key660" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key661" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key662" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key663" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key664" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key665" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key666" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key667" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key668" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key669" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key67" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key670" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key671" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key672" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key673" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key674" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key675" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key676" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key677" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key678" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key679" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key68" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key680" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key681" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key682" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key683" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key684" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key685" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key686" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key687" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key688" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key689" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key69" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key690" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key691" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key692" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key693" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key694" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key695" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key696" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key697" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key698" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key699" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key7" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key70" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key700" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key701" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key702" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key703" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key704" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key705" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key706" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key707" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key708" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key709" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key71" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key710" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key711" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key712" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key713" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key714" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key715" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key716" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key717" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key718" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key719" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key72" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key720" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key721" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key722" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key723" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key724" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key725" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key726" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key727" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key728" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key729" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key73" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key730" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key731" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key732" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key733" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key734" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key735" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key736" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key737" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key738" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key739" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key74" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key740" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key741" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key742" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key743" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key744" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key745" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key746" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key747" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key748" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key749" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key75" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key750" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key751" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key752" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key753" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key754" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key755" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key756" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key757" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key758" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key759" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key76" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key760" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key761" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key762" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key763" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key764" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key765" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key766" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key767" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key768" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key769" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key77" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key770" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key771" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key772" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key773" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key774" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key775" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key776" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key777" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key778" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key779" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key78" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key780" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key781" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key782" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key783" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key784" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key785" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key786" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key787" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key788" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key789" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key79" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key790" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key791" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key792" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key793" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key794" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key795" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key796" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key797" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key798" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key799" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key8" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key80" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key800" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key801" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key802" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key803" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key804" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key805" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key806" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key807" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key808" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key809" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key81" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key810" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key811" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key812" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key813" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key814" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key815" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key816" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key817" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key818" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key819" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key82" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key820" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key821" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key822" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key823" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key824" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key825" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key826" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key827" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key828" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key829" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key83" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key830" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key831" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key832" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key833" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key834" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key835" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key836" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key837" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key838" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key839" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key84" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key840" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key841" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key842" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key843" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key844" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key845" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key846" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key847" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key848" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key849" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key85" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key850" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key851" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key852" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key853" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key854" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key855" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key856" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key857" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key858" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key859" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key86" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key860" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key861" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key862" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key863" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key864" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key865" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key866" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key867" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key868" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key869" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key87" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key870" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key871" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key872" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key873" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key874" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key875" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key876" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key877" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key878" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key879" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key88" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key880" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key881" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key882" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key883" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key884" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key885" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key886" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key887" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key888" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key889" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key89" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key890" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key891" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key892" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key893" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key894" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key895" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key896" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key897" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key898" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key899" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key9" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key90" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key900" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key901" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key902" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key903" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key904" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key905" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key906" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key907" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key908" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key909" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key91" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key910" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key911" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key912" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key913" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key914" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key915" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key916" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key917" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key918" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key919" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key92" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key920" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key921" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key922" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key923" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key924" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key93" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key94" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key95" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key96" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key97" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key98" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key99" ON "rooms"("pin" ASC);

-- CreateIndex
CREATE INDEX "setlists_created_by_id" ON "setlists"("createdById" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key1" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key10" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key11" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key12" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key13" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key14" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key15" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key16" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key17" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key18" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key19" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key2" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key20" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key21" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key22" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key23" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key24" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key25" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key26" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key27" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key28" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key29" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key3" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key30" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key31" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key32" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key33" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key34" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key35" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key36" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key37" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key38" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key39" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key4" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key40" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key41" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key42" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key43" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key44" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key45" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key46" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key47" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key48" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key49" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key5" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key50" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key51" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key52" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key53" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key54" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key55" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key56" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key57" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key58" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key59" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key6" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key60" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key61" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key62" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key63" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key64" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key65" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key66" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key67" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key68" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key69" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key7" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key70" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key71" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key72" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key73" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key74" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key75" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key76" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key8" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_flowServiceId_key9" ON "setlists"("flowServiceId" ASC);

-- CreateIndex
CREATE INDEX "setlists_is_temporary" ON "setlists"("isTemporary" ASC);

-- CreateIndex
CREATE INDEX "setlists_is_temporary_created_at" ON "setlists"("isTemporary" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "setlists_linked_room_id" ON "setlists"("linkedRoomId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key1" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key10" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key11" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key12" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key13" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key14" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key15" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key16" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key17" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key18" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key19" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key2" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key20" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key21" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key22" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key23" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key24" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key25" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key26" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key27" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key28" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key29" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key3" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key30" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key31" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key32" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key33" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key34" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key35" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key36" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key37" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key38" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key39" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key4" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key40" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key41" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key42" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key43" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key44" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key45" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key46" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key47" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key48" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key49" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key5" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key50" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key6" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key7" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key8" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareCode_key9" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key1" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key10" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key100" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key101" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key102" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key103" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key104" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key105" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key106" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key107" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key108" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key109" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key11" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key110" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key111" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key112" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key113" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key114" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key115" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key116" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key117" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key118" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key119" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key12" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key120" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key121" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key122" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key123" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key124" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key125" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key126" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key127" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key128" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key129" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key13" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key130" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key131" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key132" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key133" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key134" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key135" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key136" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key137" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key138" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key139" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key14" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key140" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key141" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key142" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key143" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key144" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key145" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key146" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key147" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key148" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key149" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key15" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key150" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key151" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key152" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key153" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key154" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key155" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key156" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key157" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key158" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key159" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key16" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key160" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key161" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key162" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key163" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key164" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key165" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key166" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key167" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key168" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key169" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key17" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key170" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key171" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key172" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key173" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key174" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key175" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key176" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key177" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key178" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key179" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key18" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key180" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key181" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key182" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key183" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key184" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key185" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key186" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key187" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key188" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key189" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key19" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key190" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key191" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key192" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key193" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key194" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key195" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key196" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key197" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key198" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key199" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key2" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key20" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key200" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key201" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key202" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key203" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key204" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key205" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key206" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key207" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key208" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key209" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key21" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key210" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key211" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key212" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key213" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key214" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key215" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key216" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key217" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key218" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key219" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key22" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key220" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key221" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key222" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key223" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key224" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key225" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key226" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key227" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key228" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key229" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key23" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key230" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key231" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key232" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key233" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key234" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key235" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key236" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key237" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key238" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key239" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key24" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key240" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key241" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key242" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key243" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key244" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key245" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key246" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key247" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key248" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key249" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key25" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key250" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key251" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key252" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key253" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key254" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key255" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key256" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key257" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key258" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key259" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key26" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key260" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key261" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key262" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key263" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key264" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key265" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key266" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key267" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key268" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key269" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key27" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key270" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key271" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key272" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key273" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key274" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key275" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key276" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key277" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key278" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key279" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key28" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key280" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key281" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key282" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key283" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key284" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key285" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key286" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key287" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key288" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key289" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key29" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key290" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key291" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key292" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key293" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key294" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key295" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key296" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key297" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key298" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key299" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key3" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key30" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key300" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key301" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key302" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key303" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key304" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key305" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key306" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key307" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key308" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key309" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key31" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key310" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key311" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key312" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key313" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key314" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key315" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key316" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key317" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key318" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key319" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key32" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key320" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key321" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key322" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key323" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key324" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key325" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key326" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key327" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key328" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key329" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key33" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key330" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key331" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key332" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key333" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key334" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key335" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key336" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key337" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key338" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key339" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key34" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key340" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key341" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key342" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key343" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key344" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key345" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key346" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key347" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key348" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key349" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key35" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key350" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key351" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key352" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key353" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key354" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key355" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key356" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key357" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key358" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key359" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key36" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key360" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key361" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key362" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key363" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key364" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key365" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key366" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key367" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key368" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key369" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key37" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key370" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key371" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key372" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key373" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key374" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key375" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key376" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key377" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key378" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key379" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key38" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key380" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key381" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key382" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key383" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key384" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key385" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key386" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key387" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key388" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key389" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key39" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key390" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key391" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key392" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key393" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key394" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key395" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key396" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key397" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key398" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key399" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key4" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key40" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key400" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key401" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key402" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key403" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key404" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key405" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key406" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key407" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key408" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key409" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key41" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key410" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key411" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key412" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key413" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key414" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key415" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key416" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key417" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key418" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key419" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key42" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key420" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key421" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key422" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key423" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key424" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key425" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key426" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key427" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key428" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key429" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key43" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key430" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key431" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key432" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key433" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key434" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key435" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key436" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key437" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key438" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key439" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key44" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key440" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key441" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key442" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key443" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key444" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key445" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key446" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key447" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key448" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key449" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key45" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key450" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key451" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key452" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key453" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key454" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key455" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key456" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key457" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key458" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key459" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key46" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key460" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key461" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key462" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key463" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key464" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key465" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key466" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key467" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key468" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key469" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key47" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key470" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key471" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key472" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key473" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key474" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key475" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key476" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key477" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key478" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key479" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key48" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key480" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key481" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key482" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key483" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key484" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key485" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key486" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key487" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key488" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key489" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key49" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key490" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key491" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key492" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key493" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key494" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key495" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key496" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key497" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key498" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key499" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key5" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key50" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key500" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key501" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key502" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key503" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key504" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key505" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key506" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key507" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key508" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key509" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key51" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key510" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key511" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key512" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key513" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key514" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key515" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key516" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key517" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key518" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key519" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key52" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key520" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key521" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key522" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key523" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key524" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key525" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key526" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key527" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key528" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key529" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key53" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key530" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key531" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key532" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key533" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key534" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key535" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key536" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key537" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key538" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key539" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key54" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key540" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key541" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key542" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key543" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key544" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key545" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key546" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key547" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key548" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key549" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key55" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key550" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key551" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key552" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key553" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key554" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key555" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key556" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key557" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key558" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key559" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key56" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key560" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key561" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key562" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key563" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key564" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key565" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key566" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key567" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key568" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key569" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key57" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key570" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key571" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key572" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key573" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key574" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key575" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key576" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key577" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key578" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key579" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key58" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key580" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key581" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key582" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key583" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key584" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key585" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key586" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key587" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key588" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key589" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key59" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key590" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key591" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key592" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key593" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key594" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key595" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key596" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key597" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key598" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key599" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key6" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key60" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key600" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key601" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key602" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key603" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key604" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key605" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key606" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key607" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key608" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key609" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key61" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key610" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key611" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key612" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key613" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key614" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key615" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key616" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key617" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key618" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key619" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key62" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key620" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key621" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key622" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key623" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key624" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key625" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key626" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key627" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key628" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key629" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key63" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key630" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key631" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key632" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key633" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key634" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key635" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key636" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key637" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key638" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key639" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key64" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key640" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key641" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key642" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key643" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key644" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key645" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key646" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key647" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key648" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key649" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key65" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key650" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key651" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key652" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key653" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key654" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key655" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key656" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key657" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key658" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key659" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key66" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key660" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key661" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key662" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key663" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key664" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key665" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key666" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key667" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key668" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key669" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key67" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key670" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key671" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key672" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key673" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key674" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key675" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key676" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key677" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key678" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key679" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key68" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key680" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key681" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key682" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key683" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key684" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key685" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key686" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key687" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key688" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key689" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key69" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key690" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key691" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key692" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key693" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key694" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key695" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key696" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key697" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key698" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key699" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key7" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key70" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key700" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key701" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key702" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key703" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key704" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key705" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key706" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key707" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key708" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key709" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key71" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key710" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key711" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key712" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key713" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key714" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key715" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key716" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key717" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key718" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key719" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key72" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key720" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key721" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key722" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key723" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key724" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key725" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key726" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key727" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key728" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key729" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key73" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key730" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key731" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key732" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key733" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key734" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key735" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key736" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key737" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key738" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key739" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key74" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key740" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key741" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key742" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key743" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key744" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key745" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key746" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key747" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key748" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key749" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key75" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key750" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key751" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key752" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key753" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key754" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key755" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key756" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key757" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key758" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key759" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key76" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key760" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key761" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key762" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key763" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key764" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key765" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key766" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key767" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key768" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key769" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key77" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key770" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key771" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key772" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key773" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key774" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key775" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key776" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key777" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key778" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key779" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key78" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key780" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key781" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key782" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key783" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key784" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key785" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key786" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key787" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key788" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key789" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key79" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key790" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key791" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key792" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key793" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key794" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key795" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key796" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key797" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key798" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key799" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key8" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key80" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key800" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key801" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key802" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key803" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key804" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key805" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key806" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key807" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key808" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key809" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key81" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key810" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key811" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key812" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key813" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key814" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key815" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key816" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key817" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key818" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key819" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key82" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key820" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key821" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key822" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key823" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key824" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key825" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key826" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key827" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key828" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key829" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key83" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key830" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key831" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key832" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key833" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key834" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key835" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key836" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key837" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key838" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key839" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key84" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key840" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key841" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key842" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key843" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key844" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key845" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key846" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key847" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key848" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key849" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key85" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key850" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key851" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key852" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key853" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key854" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key855" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key856" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key857" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key858" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key859" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key86" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key860" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key861" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key862" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key863" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key864" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key865" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key866" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key867" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key868" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key869" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key87" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key870" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key871" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key872" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key873" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key874" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key875" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key876" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key877" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key878" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key879" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key88" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key880" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key881" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key882" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key883" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key884" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key885" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key886" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key887" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key888" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key889" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key89" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key890" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key9" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key90" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key91" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key92" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key93" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key94" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key95" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key96" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key97" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key98" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "setlists_shareToken_key99" ON "setlists"("shareToken" ASC);

-- CreateIndex
CREATE INDEX "setlists_share_code" ON "setlists"("shareCode" ASC);

-- CreateIndex
CREATE INDEX "setlists_updated_at" ON "setlists"("updatedAt" ASC);

-- CreateIndex
CREATE INDEX "shared_services_service_id" ON "shared_services"("serviceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shared_services_service_id_user_id" ON "shared_services"("serviceId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "shared_services_user_id" ON "shared_services"("userId" ASC);

-- CreateIndex
CREATE INDEX "shared_songs_shared_by_id" ON "shared_songs"("sharedById" ASC);

-- CreateIndex
CREATE INDEX "shared_songs_song_id" ON "shared_songs"("songId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shared_songs_song_id_user_id" ON "shared_songs"("songId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "shared_songs_user_id" ON "shared_songs"("userId" ASC);

-- CreateIndex
CREATE INDEX "song_mappings_no_match" ON "song_mappings"("noMatch" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "song_mappings_soluflowId_key" ON "song_mappings"("soluflowId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "song_mappings_soluflow_id" ON "song_mappings"("soluflowId" ASC);

-- CreateIndex
CREATE INDEX "song_mappings_solupresenter_id" ON "song_mappings"("solupresenterId" ASC);

-- CreateIndex
CREATE INDEX "song_reports_reporter_email" ON "song_reports"("reporterEmail" ASC);

-- CreateIndex
CREATE INDEX "song_reports_reviewed_by_id" ON "song_reports"("reviewedById" ASC);

-- CreateIndex
CREATE INDEX "song_reports_song_id" ON "song_reports"("songId" ASC);

-- CreateIndex
CREATE INDEX "song_reports_status" ON "song_reports"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "song_workspaces_songId_workspaceId_key" ON "song_workspaces"("songId" ASC, "workspaceId" ASC);

-- CreateIndex
CREATE INDEX "song_workspaces_song_id" ON "song_workspaces"("songId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "song_workspaces_song_id_workspace_id" ON "song_workspaces"("songId" ASC, "workspaceId" ASC);

-- CreateIndex
CREATE INDEX "song_workspaces_workspace_id" ON "song_workspaces"("workspaceId" ASC);

-- CreateIndex
CREATE INDEX "songs_created_by_id" ON "songs"("createdById" ASC);

-- CreateIndex
CREATE INDEX "songs_is_pending_approval" ON "songs"("isPendingApproval" ASC);

-- CreateIndex
CREATE INDEX "songs_is_public_created_by_id" ON "songs"("isPublic" ASC, "createdById" ASC);

-- CreateIndex
CREATE INDEX "songs_original_language" ON "songs"("originalLanguage" ASC);

-- CreateIndex
CREATE INDEX "songs_soluflow_legacy_id" ON "songs"("soluflowLegacyId" ASC);

-- CreateIndex
CREATE INDEX "songs_title" ON "songs"("title" ASC);

-- CreateIndex
CREATE INDEX "songs_updated_at" ON "songs"("updatedAt" ASC);

-- CreateIndex
CREATE INDEX "songs_usage_count" ON "songs"("usageCount" ASC);

-- CreateIndex
CREATE INDEX "songs_workspace_id" ON "songs"("workspaceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key1" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key10" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key11" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key12" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key13" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key14" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key15" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key16" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key17" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key18" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key19" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key2" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key20" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key21" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key22" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key23" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key24" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key25" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key26" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key27" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key28" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key29" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key3" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key30" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key31" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key32" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key33" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key34" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key35" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key36" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key37" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key38" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key39" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key4" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key40" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key41" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key42" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key43" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key44" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key45" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key46" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key47" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key48" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key49" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key5" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key50" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key51" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key52" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key53" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key54" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key55" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key56" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key57" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key58" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key59" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key6" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key60" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key61" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key62" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key63" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key64" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key65" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key66" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key67" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key68" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key69" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key7" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key70" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key71" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key72" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key73" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key74" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key75" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key76" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key77" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key78" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key79" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key8" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key80" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key81" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key82" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key83" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key84" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key85" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key86" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key87" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sso_codes_code_key9" ON "sso_codes"("code" ASC);

-- CreateIndex
CREATE INDEX "sso_codes_expires_at" ON "sso_codes"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "stage_monitor_themes_created_by_id" ON "stage_monitor_themes"("createdById" ASC);

-- CreateIndex
CREATE INDEX "stage_monitor_themes_is_built_in" ON "stage_monitor_themes"("isBuiltIn" ASC);

-- CreateIndex
CREATE INDEX "stage_monitor_themes_name" ON "stage_monitor_themes"("name" ASC);

-- CreateIndex
CREATE INDEX "users_active_room_id" ON "users"("activeRoomId" ASC);

-- CreateIndex
CREATE INDEX "users_email" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key1" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key10" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key100" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key101" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key102" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key103" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key104" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key105" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key106" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key107" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key108" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key109" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key11" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key110" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key111" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key112" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key113" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key114" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key115" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key116" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key117" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key118" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key119" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key12" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key120" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key121" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key122" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key123" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key124" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key125" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key126" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key127" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key128" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key129" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key13" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key130" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key131" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key132" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key133" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key134" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key135" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key136" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key137" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key138" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key139" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key14" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key140" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key141" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key142" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key143" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key144" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key145" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key146" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key147" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key148" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key149" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key15" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key150" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key151" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key152" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key153" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key154" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key155" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key156" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key157" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key158" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key159" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key16" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key160" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key161" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key162" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key163" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key164" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key165" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key166" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key167" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key168" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key169" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key17" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key170" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key171" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key172" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key173" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key174" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key175" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key176" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key177" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key178" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key179" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key18" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key180" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key181" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key182" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key183" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key184" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key185" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key186" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key187" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key188" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key189" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key19" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key190" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key191" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key192" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key193" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key194" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key195" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key196" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key197" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key198" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key199" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key2" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key20" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key200" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key201" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key202" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key203" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key204" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key205" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key206" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key207" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key208" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key209" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key21" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key210" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key211" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key212" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key213" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key214" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key215" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key216" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key217" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key218" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key219" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key22" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key220" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key221" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key222" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key223" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key224" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key225" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key226" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key227" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key228" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key23" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key24" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key25" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key26" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key27" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key28" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key29" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key3" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key30" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key31" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key32" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key33" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key34" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key35" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key36" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key37" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key38" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key39" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key4" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key40" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key41" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key42" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key43" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key44" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key45" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key46" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key47" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key48" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key49" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key5" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key50" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key51" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key52" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key53" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key54" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key55" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key56" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key57" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key58" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key59" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key6" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key60" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key61" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key62" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key63" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key64" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key65" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key66" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key67" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key68" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key69" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key7" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key70" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key71" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key72" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key73" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key74" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key75" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key76" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key77" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key78" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key79" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key8" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key80" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key81" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key82" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key83" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key84" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key85" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key86" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key87" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key88" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key89" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key9" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key90" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key91" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key92" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key93" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key94" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key95" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key96" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key97" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key98" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key99" ON "users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_email_verification_token" ON "users"("emailVerificationToken" ASC);

-- CreateIndex
CREATE INDEX "users_password_reset_token" ON "users"("passwordResetToken" ASC);

-- CreateIndex
CREATE INDEX "viewer_themes_created_by_id" ON "viewer_themes"("createdById" ASC);

-- CreateIndex
CREATE INDEX "viewer_themes_is_built_in" ON "viewer_themes"("isBuiltIn" ASC);

-- CreateIndex
CREATE INDEX "viewer_themes_name" ON "viewer_themes"("name" ASC);

-- CreateIndex
CREATE INDEX "workspace_invitations_created_by_id" ON "workspace_invitations"("createdById" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token" ON "workspace_invitations"("token" ASC);

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id" ON "workspace_invitations"("workspaceId" ASC);

-- CreateIndex
CREATE INDEX "workspace_members_user_id" ON "workspace_members"("userId" ASC);

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id" ON "workspace_members"("workspaceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id" ON "workspace_members"("workspaceId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "workspaces_created_by_id" ON "workspaces"("createdById" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug" ON "workspaces"("slug" ASC);

-- CreateIndex
CREATE INDEX "workspaces_workspace_type" ON "workspaces"("workspaceType" ASC);

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_linkedPermanentSetlistId_fkey" FOREIGN KEY ("linkedPermanentSetlistId") REFERENCES "setlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_temporarySetlistId_fkey" FOREIGN KEY ("temporarySetlistId") REFERENCES "setlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

