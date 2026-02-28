-- CreateIndex
CREATE INDEX "events_event_teams_gin" ON "events" USING GIN ("event_teams" jsonb_path_ops);
