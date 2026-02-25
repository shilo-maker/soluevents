# Solu Events

Event and tour management platform for Solu Plan - a comprehensive system for planning, executing, and reviewing events and tours with integrated task management, role assignments, and team coordination.

## Overview

Solu Events is designed specifically for organizations that need to manage worship events, in-house productions, film projects, and multi-day tours. It centralizes planning, logistics, media coordination, and team communication in one place.

## Status

✅ **MVP Foundation Complete** - The core infrastructure is built and ready for use:
- Full authentication system with JWT
- Complete database schema with all models
- REST API for events, tours, tasks, and users
- Frontend routing and layout
- Role-based access control structure

## Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL 14+** database

### Installation

```bash
# 1. Install all dependencies
npm install
cd frontend && npm install
cd ../backend && npm install

# 2. Set up the database
cd backend
# Update .env with your PostgreSQL credentials if needed

# 3. Generate Prisma Client and run migrations
npm run prisma:generate
npm run prisma:migrate

# 4. (Optional) Seed with demo data
npm run prisma:seed

# 5. Start the application
cd ..
npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

**Demo accounts** (password: `password123`):
- rebekah@soluevents.com (Admin)
- sarah@soluevents.com (Manager)
- shilo@soluevents.com (Manager)

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## Project Structure

```
soluevents/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Dashboard, Events, Tours, Tasks)
│   │   ├── stores/        # Zustand state management
│   │   ├── types/         # TypeScript type definitions
│   │   ├── lib/           # Utilities (axios, etc.)
│   │   └── App.tsx        # Main app with routing
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # Node.js backend API
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Database seeder
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth & error handling
│   │   ├── utils/         # JWT utilities
│   │   └── index.ts       # Express server
│   ├── .env               # Environment config
│   └── package.json
│
├── package.json            # Root workspace config
├── README.md               # This file
└── SETUP.md                # Detailed setup guide
```

## Tech Stack

### Frontend
- **React 18** + **TypeScript** - UI framework with type safety
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client with interceptors

### Backend
- **Node.js** + **Express** + **TypeScript** - Server framework
- **Prisma ORM** - Type-safe database client
- **PostgreSQL** - Relational database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

## Core Features (MVP)

### ✅ Implemented
1. **Authentication System**
   - User registration and login
   - JWT access & refresh tokens
   - Password hashing with bcrypt
   - Protected routes

2. **Database Schema**
   - Users with org roles (admin, manager, member, viewer)
   - Events (worship, in-house, film, tour_child)
   - Tours with daily schedules
   - Tasks with priorities and statuses
   - Role assignments per event/tour
   - Comments, files, templates, notifications

3. **REST API**
   - `/api/auth` - Register, login, refresh, me
   - `/api/events` - CRUD operations
   - `/api/tours` - Tour management
   - `/api/tasks` - Task management
   - `/api/users` - User directory

4. **Frontend Foundation**
   - Responsive layout with sidebar navigation
   - Login/Register pages
   - Dashboard, Events, Tours, Tasks pages (shells)
   - Authentication state management
   - API client with auto-refresh

### 🚧 Next Steps

**High Priority:**
1. **Event Wizard** - 6-step flow (Template → Basics → Roles → Program/Rider → Tasks → Review)
2. **Event Detail Page** - Tabs for Overview, Roles, Agenda, Rider, Tasks, Files, Comments
3. **Tour Daily Schedule** - Add/edit tour days, drive time calculations, devotional roster
4. **Task Views** - Kanban board, calendar view, filters by assignee/status
5. **Dashboard Data** - Populate with real upcoming events and tasks

**Medium Priority:**
6. **File Management** - Upload/link files to events and tours
7. **Comments System** - Add comments with @mentions
8. **Templates UI** - Create and manage event/tour templates
9. **Role Assignments** - Assign users to event roles with permissions
10. **Notifications** - In-app notification center

**Lower Priority:**
11. **Calendar Views** - Month/week views for events
12. **iCal Export** - Per-user calendar feeds
13. **Email Notifications** - SendGrid/SES integration
14. **Google Maps** - Address autocomplete, drive time calculations
15. **Advanced Filters** - Search, tags, date ranges

## API Endpoints

### Authentication
```
POST   /api/auth/register    Register new user
POST   /api/auth/login        Login with email/password
POST   /api/auth/refresh      Refresh access token
GET    /api/auth/me           Get current user
```

### Events
```
GET    /api/events            List all events
POST   /api/events            Create new event
GET    /api/events/:id        Get event details
PATCH  /api/events/:id        Update event
DELETE /api/events/:id        Delete event
```

### Tours
```
GET    /api/tours             List all tours
POST   /api/tours             Create new tour
GET    /api/tours/:id         Get tour details
PATCH  /api/tours/:id         Update tour
DELETE /api/tours/:id         Delete tour
```

### Tasks
```
GET    /api/tasks             List tasks (query: assignee, event_id, tour_id, status)
POST   /api/tasks             Create new task
GET    /api/tasks/:id         Get task details
PATCH  /api/tasks/:id         Update task
DELETE /api/tasks/:id         Delete task
```

### Users
```
GET    /api/users             List all active users
GET    /api/users/:id         Get user details
```

## Database Models

- **User** - Team members with org roles
- **Event** - Worship nights, in-house events, film productions, tour children
- **Tour** - Multi-day tours with metadata
- **TourDay** - Daily schedule entries (city, venue, times, drive duration)
- **RoleAssignment** - User roles per event/tour (event_manager, worship_lead, etc.)
- **Task** - Todo items with assignees, priorities, due dates
- **Comment** - Threaded comments on events/tasks/tours
- **File** - File attachments with versioning
- **Template** - Reusable event/tour templates
- **Notification** - User notifications

## Available Scripts

### Root
```bash
npm run dev              # Run both frontend and backend
npm run build            # Build both for production
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only
```

### Backend (`cd backend`)
```bash
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm start                # Run production build
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run DB migrations
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:seed      # Seed demo data
```

### Frontend (`cd frontend`)
```bash
npm run dev              # Start dev server (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build
```

## Configuration

### Backend Environment (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/solu_events"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
```

### Frontend Proxy
Vite proxies `/api` requests to `http://localhost:3000` (configured in `vite.config.ts`).

## Permissions Model

**Org Roles:**
- **Admin** - Full system access, user management
- **Manager** - Create/edit all events/tasks, view reports
- **Member** - Create/edit own items, view assigned events
- **Viewer** - Read-only access

**Event/Tour Roles:**
- Event Manager, Worship Lead, Media Lead, Logistics, Hospitality, Comms, Contributor, Guest

> Effective permission = max(org role, event role)

## Contributing

This is a proprietary project for Solu Plan. For questions or suggestions, contact the project maintainer.

## Support

- **Setup Issues**: See [SETUP.md](./SETUP.md)
- **Spec Reference**: `solu_events_app_creation_spec_readme.md`
- **API Testing**: Use Prisma Studio (`npm run prisma:studio`) or your preferred REST client

## License

Proprietary - Solu Plan © 2025
