# Solu Events — App Creation Spec (README)

> **Purpose:** Define the MVP (and near‑term v1.1) for **Solu Events** — an event & tour planner that plugs into Solu Plan as the operations hub. This file is written for product, design, and engineering to build directly.

---

## 1) Vision & Scope

**Vision:** A single, clear place to plan, execute, and review Solu’s events and tours, with tasks, roles, schedules, assets, and comms in sync.

**Primary users:**
- **Rebekah (Admin):** creates events/tours, assigns roles, oversees media & promo, manages templates.
- **Sarah (Manager):** logistics, riders, scheduling, conflicts, team coordination.
- **Shilo (Manager):** worship sets, creative direction, approvals, high‑level view.
- **JM (Member):** comms, registration, donor‑related tasks.
- **Sandra (Member):** hospitality & food, volunteer rosters.
- **Levi (Member):** graphics/video production, brand consistency.
- **Jeremiah (Member):** editing, projection packs, capture uploads.

**Out of scope (MVP):** payments, QuickBooks write‑back, advanced inventory, HR.

---

## 2) Core Features (MVP)

1. **Home Dashboard** (per user): Upcoming events (30 days), Pending Tasks (by priority), Notifications (mentions, status changes).
2. **Events**
   - List / Calendar / Kanban (by phase).
   - **New Event Wizard** (templates: Worship Night, In‑House Event, Film Production, Tour).
   - Event Overview (core fields, roles, rider, program agenda, files, comments, activity).
   - **Tour parent** with Start/End dates; daily schedule rows; linked child events.
3. **Tasks**
   - My Tasks / Team Tasks views; List / Kanban / Calendar.
   - Priorities, statuses, due dates, attachments, mentions, subtasks.
4. **Templates**
   - Default technical rider, default program agenda per template.
   - Save any event/tour as reusable template (yearly versions).
5. **Files & Assets**
   - Per‑event folders; drag‑drop; versioning; Google Drive/Dropbox link storage.
6. **Notifications**
   - In‑app + email for @mentions, assignments, due‑soon, overdue, schedule changes, file uploads.

---

## 3) Roles & Permissions

**Org roles**
- **Admin:** full system access, user mgmt (Rebekah).
- **Manager:** create/edit all events/tasks; budgets; exports (Sarah, Shilo).
- **Member:** create/edit items they own; view anything in events where they have a role (JM, Sandra, Levi, Jeremiah).
- **Viewer:** read‑only.

**Event/Tour roles (per record)**
- Event Manager, Worship Lead, Media Lead, Logistics, Hospitality, Comms, Contributor, Guest.

> Effective permission = max(org role, event role). Guests: read core info + upload files to a drop zone; no internal comments.

---

## 4) Data Model (MVP)

**User**
- id, name, email, org_role (admin|manager|member|viewer), avatar_url, is_active

**Event**
- id, type (worship|in_house|film|tour_child), title, description, date_start, date_end, timezone,
- location_name, address, est_attendance,
- phase (concept|prep|execution|follow_up), status (planned|confirmed|canceled|archived),
- parent_tour_id (nullable), tags[], created_by

**Tour** (parent)
- id, title, start_date, end_date, regions[], director_user_id, logistics_user_id,
- comms_user_id, media_user_id, hospitality_user_id

**TourDay**
- id, tour_id, date, city, venue_name,
- wake_time, drive_start_time, drive_duration_minutes, lunch_time, event_start_time,
- lodging_name, lodging_arrival_time,
- devotional_user_id, is_laundry_day (bool), is_shopping_day (bool),
- linked_event_id (nullable)

**RoleAssignment**
- id, event_id (or tour_id), user_id, role (event_manager|worship_lead|media_lead|logistics|hospitality|comms|contributor|guest),
- scope (event|tour|tour_day)

**Task**
- id, title, description, priority (critical|high|normal), status (not_started|in_progress|waiting|blocked|done),
- due_at, event_id (nullable), tour_id (nullable), assignee_id, creator_id, parent_task_id (nullable)

**Comment**
- id, body (markdown), author_id, entity_type (event|task|tour|tour_day), entity_id, mentions[]

**File**
- id, event_id (nullable), tour_id (nullable), uploader_id, filename, url, version, notes

**Template**
- id, kind (event|tour), label, default_fields (json), default_tasks (json), default_agenda (json), default_rider (json)

**Notification**
- id, user_id (recipient), type, payload (json), read_at

---

## 5) New Event Wizard (field spec)

**Step 1 — Template**
- Select: Worship Night | In‑House Event | Film Production | Tour

**Step 2 — Basics**
- Title (required)
- Date & Time (required; end defaults to start + 3h; timezone default org tz)
- Location name (optional)
- Address (Google Places autocomplete; store plain string + place_id)
- Estimated attendance (number)

**Step 3 — Roles**
- Sound engineer (contact ref or freeform)
- Venue contact (ref/freeform)
- Projection person (ref/freeform)
- Food/Hospitality (optional)
- Pastor (optional)
- MC (optional)
- Worship team members (multi‑select users)

**Step 4 — Program & Rider**
- Program agenda (list of blocks: label, start, duration, notes)
- Technical rider (markdown + attachments); prefilled from template

**Step 5 — Tasks**
- Auto‑generated checklist with smart assignees & due dates (relative to event date)
  - Prepare flyer/social → (Rebekah & Levi)
  - Send rider to sound → (Sarah)
  - Open registration → (JM)
  - Send set list to team & contact → (Shilo)
  - Send projection pack → (Jeremiah)
  - Hospitality plan → (Sandra)

**Step 6 — Review & Create**
- Summary view → Confirm → Notify assignees (+ create calendar invites opt‑in)

---

## 6) Tour Flow (parent + days + children)

**Create Tour (parent)**
- Title, **Start Date**, **End Date**, Regions (tags), assign core leads (director, logistics, comms, media, hospitality).

**Add Tour Days**
- For each day: city/venue, date, wake time, drive start, **drive duration** (minutes; auto‑calc via Maps API or manual), lunch time, event time, lodging name & arrival, devotional giver (user), Laundry/Shopping booleans.
- Option: **Generate linked Worship Night** from template (child Event) or link existing.

**Aggregations**
- Daily total drive time, **Total tour drive hours**, number of events, upcoming next‑stop widget, route map.

---

## 7) Views & UX

**Home**
- Upcoming Events (30 days; quick filters)
- My Pending Tasks (by priority; due‑soon/overdue badges)
- Notifications feed (mentions, assignments, changes, files)

**Events**
- Tabs: List | Calendar | Kanban (by phase)
- Filters: Type, Date range, Owner, Tag, City, Status, Tour Only
- Archive toggle; bulk duplicate; export CSV/PDF

**Event Detail**
- Header: title, date/time, location, phase/status, tags, actions (duplicate, archive, export)
- Tabs: Overview | Roles | Agenda | Rider | Tasks | Files | Comments | Activity

**Tour Detail**
- Header: title, **Start–End dates**, leaders, metrics
- Tabs: Overview | **Daily Schedule** | Map | Tasks | Files | Devotionals | Linked Events | Reports
- Daily Schedule table/cards show **Drive Duration** per row and a **Total Drive** summary.

**Tasks**
- Views: My Tasks / Team Tasks → List | Kanban | Calendar
- Quick actions: complete, reassign, snooze, add subtask

---

## 8) Integrations (MVP)
- **Calendar iCal** per user (read‑only, subscribe). Conflict warnings for overlaps.
- **Google Places API** for address + distance/drive time (optional key‑gate).
- **Google Drive/Dropbox**: link storage; store file URLs + metadata.
- Email via SendGrid/SES for notifications.

---

## 9) Validation & Defaults
- Required: title, date/time for events; start/end dates for tours.
- Timezone: default org tz; per‑event override allowed.
- Drive duration: integer minutes; allow manual entry if Maps disabled.
- Program blocks cannot overlap; warn on gaps.
- Templates must include at least one agenda block or rider markdown.

---

## 10) Notifications (rules)
- Task assigned/reassigned; due‑soon (24h), overdue (daily); task completed.
- @mention in comments.
- Event date/time change; tour day changed.
- File uploaded to an event I participate in.
- Digest email (daily/weekly) preference; quiet hours (22:00–07:00 local).

---

## 11) Security & Privacy
- SSO optional later; email/password for MVP.
- RBAC enforcement at API & DB levels.
- Row‑level access: event participants + org managers/admins.
- Audit log for changes to dates, roles, tasks, and files.

---

## 12) Tech Stack (suggested)
- **Frontend:** React + TypeScript, TanStack Query, Zustand/Redux, React Router.
- **UI:** Tailwind + shadcn/ui; icons: lucide-react.
- **Backend:** Node.js (NestJS or Express) + TypeScript; Prisma ORM.
- **DB:** Postgres (Supabase/Neon/Cloud SQL).
- **Auth:** JWT + refresh; hashed passwords (argon2/bcrypt).
- **File storage:** link‑only (MVP) or S3-compatible for uploads.
- **Infra:** Render/Fly/Heroku (MVP); Vercel for frontend; Docker for parity.
- **Maps:** Google Maps Platform (Distance Matrix) optional.

---

## 13) API Sketch (REST)
```
POST   /auth/login
GET    /me

GET    /events
POST   /events
GET    /events/:id
PATCH  /events/:id
POST   /events/:id/duplicate
POST   /events/:id/archive

GET    /tours
POST   /tours
GET    /tours/:id
PATCH  /tours/:id
POST   /tours/:id/days
PATCH  /tours/:id/days/:dayId
POST   /tours/:id/link-event

GET    /tasks?assignee=me
POST   /tasks
PATCH  /tasks/:id

POST   /comments
GET    /files?eventId=...
POST   /files (metadata + url)

GET    /templates
POST   /templates
```

---

## 14) Permissions Matrix (summary)
| Action | Admin | Manager | Member | Viewer | Guest |
|---|---|---|---|---|---|
| Create event/tour | ✓ | ✓ | (own) | ✗ | ✗ |
| Edit any event | ✓ | ✓ | (assigned) | ✗ | ✗ |
| View event | ✓ | ✓ | (assigned) | ✓ | (limited) |
| Manage roles | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create/assign tasks | ✓ | ✓ | ✓ (within assigned event) | ✗ | ✗ |
| Upload files | ✓ | ✓ | ✓ | ✗ | ✓ (drop zone) |

---

## 15) Analytics & Reporting
- Event summary export (PDF/CSV): attendance, roles, tasks completed %, costs (manual), links to media.
- Tour summary: events count, total drive hours, devotional roster, highlights.
- Team workload: tasks by person, overdue counts.

---

## 16) QA Checklist (MVP)
- Create each template via wizard; verify defaults render correctly.
- Add/edit program agenda; validate overlap rules.
- Assign roles; verify permissions in UI & API.
- Create tour → add days → generate child events; totals compute.
- Task flows: assign, mention, complete; notifications fire.
- Timezone correctness for multi‑region tours.
- Archive/unarchive flows; calendar views; iCal feed validity.

---

## 17) Roadmap (v1.1+)
- **Mobile day‑of mode** (quick timeline; call/WhatsApp buttons).
- **Calendar write‑back** (Google/Microsoft) + conflict resolution.
- **Checklists per program item** (e.g., Livestream Ready).
- **Registration forms** (simple RSVP) + attendee import.
- **QuickBooks** export; basic budget tracking.
- **Automation rules** (e.g., on template select → auto‑assign standard owners).

---

## 18) Open Questions
1. Registration: internal link storage only, or native forms in v1?
2. Maps: mandate API or keep drive duration manual with optional auto‑calc?
3. File storage: continue link‑only or enable direct upload (S3) in v1?
4. Guest access: email‑pinned magic links for venue contacts?
5. Should program agenda sync from tour to children be one‑way or bi‑directional (with conflict resolution)?

---

**Owner:** Rebekah (Admin).  
**Product:** Solu Events within Solu Plan.  
**Status:** MVP spec — ready for design handoff & dev breakdown.
