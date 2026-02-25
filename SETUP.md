# Solu Events - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)

## Installation Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Set up PostgreSQL Database

Create a new PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE solu_events;

# Exit psql
\q
```

### 3. Configure Environment Variables

The backend `.env` file has already been created with default values. Update it if needed:

```bash
cd backend
# Edit .env file with your database credentials
```

Default configuration:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solu_events?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-key-change-in-production"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
```

### 4. Initialize Database with Prisma

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 5. Start the Application

You have two options:

**Option A: Run both frontend and backend together (recommended)**
```bash
# From the root directory
npm run dev
```

**Option B: Run separately**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health

## First-Time Usage

1. **Register a new account**: Navigate to http://localhost:5173 and click "Sign up"
2. **Create your first event**: After logging in, click "New Event" from the Events page
3. **Explore**: Check out the Dashboard, Tours, and Tasks pages

## Tech Stack Summary

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- React Router (routing)
- TanStack Query (data fetching)
- Tailwind CSS (styling)
- Zustand (state management)
- Lucide React (icons)

### Backend
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt (password hashing)

## Project Structure

```
soluevents/
├── frontend/
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # Reusable React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities (axios config, etc.)
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand state stores
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Server entry point
│   ├── .env               # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── package.json           # Root package.json
├── README.md
└── SETUP.md              # This file
```

## Available Scripts

### Root
- `npm run dev` - Run both frontend and backend
- `npm run build` - Build both frontend and backend

### Frontend (cd frontend)
- `npm run dev` - Start dev server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (cd backend)
- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -U postgres -l`
- Check DATABASE_URL in backend/.env

### Port Already in Use
- Backend (3000): Change PORT in backend/.env
- Frontend (5173): Change port in frontend/vite.config.ts

### Module Not Found Errors
- Delete node_modules and package-lock.json
- Run `npm install` again

### Prisma Client Issues
- Run `npm run prisma:generate` in backend folder
- Restart your IDE/editor

## Next Steps

The MVP foundation is complete! Here are suggested next steps:

1. **Implement the New Event Wizard** (6-step flow)
2. **Build Event Detail page** with tabs
3. **Add Tour management** with daily schedules
4. **Implement Task Kanban views**
5. **Add file upload functionality**
6. **Build notification system**
7. **Create template management**
8. **Add calendar views**

## Support

For questions or issues:
- Check the spec: `solu_events_app_creation_spec_readme.md`
- Review the code structure above
- Check console logs for errors
