# Solu Events - Developer Guide

Quick reference for developing and extending Solu Events.

## Development Workflow

### Starting Development

```bash
# Terminal 1: Start both servers
npm run dev

# OR Terminal 1: Backend only
cd backend && npm run dev

# Terminal 2: Frontend only
cd frontend && npm run dev
```

### Making Database Changes

```bash
cd backend

# 1. Edit prisma/schema.prisma
# 2. Create migration
npm run prisma:migrate

# 3. Regenerate Prisma Client
npm run prisma:generate

# 4. Restart backend server
```

### Adding a New API Endpoint

1. **Update Prisma Schema** (if needed)
   ```prisma
   // backend/prisma/schema.prisma
   model MyNewModel {
     id String @id @default(uuid())
     // ... fields
   }
   ```

2. **Create Controller**
   ```typescript
   // backend/src/controllers/myController.ts
   import { Response, NextFunction } from 'express'
   import { PrismaClient } from '@prisma/client'
   import { AuthRequest } from '../middleware/auth'

   const prisma = new PrismaClient()

   export const getMyData = async (
     req: AuthRequest,
     res: Response,
     next: NextFunction
   ) => {
     try {
       const data = await prisma.myNewModel.findMany()
       res.json(data)
     } catch (error) {
       next(error)
     }
   }
   ```

3. **Create Route**
   ```typescript
   // backend/src/routes/myRoutes.ts
   import { Router } from 'express'
   import { authenticate } from '../middleware/auth'
   import { getMyData } from '../controllers/myController'

   const router = Router()
   router.use(authenticate)
   router.get('/', getMyData)

   export default router
   ```

4. **Register Route in index.ts**
   ```typescript
   // backend/src/index.ts
   import myRoutes from './routes/myRoutes'
   app.use('/api/my-endpoint', myRoutes)
   ```

### Adding a New Frontend Page

1. **Create Page Component**
   ```typescript
   // frontend/src/pages/MyPage.tsx
   export default function MyPage() {
     return (
       <div className="space-y-6">
         <h1 className="text-2xl font-bold text-gray-900">My Page</h1>
         <div className="card">
           {/* Content */}
         </div>
       </div>
     )
   }
   ```

2. **Add Route**
   ```typescript
   // frontend/src/App.tsx
   import MyPage from './pages/MyPage'

   <Route path="/my-page" element={<MyPage />} />
   ```

3. **Add Navigation Link** (optional)
   ```typescript
   // frontend/src/components/Layout.tsx
   const navigation = [
     // ... existing items
     { name: 'My Page', href: '/my-page', icon: MyIcon },
   ]
   ```

## Common Tasks

### Adding a New User

**Via API:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Via Prisma Studio:**
```bash
cd backend
npm run prisma:studio
# Navigate to User table and add manually
# Remember to hash password first!
```

### Querying Data

**Backend (Prisma):**
```typescript
// Find all events for a user
const events = await prisma.event.findMany({
  where: {
    role_assignments: {
      some: {
        user_id: userId,
      },
    },
  },
  include: {
    creator: true,
    tasks: true,
  },
})
```

**Frontend (TanStack Query):**
```typescript
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get('/events')
      return response.data
    },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{/* Render data */}</div>
}
```

### Error Handling

**Backend:**
```typescript
import { AppError } from '../middleware/errorHandler'

// Throw operational errors
throw new AppError('Resource not found', 404)
throw new AppError('Unauthorized', 401)
throw new AppError('Validation failed', 400)
```

**Frontend:**
```typescript
try {
  await api.post('/events', eventData)
} catch (error: any) {
  const message = error.response?.data?.message || 'Something went wrong'
  // Show error to user
  console.error(message)
}
```

### Authentication

**Protected Backend Route:**
```typescript
import { authenticate, authorize } from '../middleware/auth'

// Require authentication
router.get('/protected', authenticate, handler)

// Require specific role
router.post('/admin-only', authenticate, authorize('admin'), handler)

// Access user in handler
export const handler = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const userRole = req.user!.org_role
  // ...
}
```

**Frontend Auth State:**
```typescript
import { useAuthStore } from '@/stores/authStore'

function MyComponent() {
  const { user, isAuthenticated, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
  }

  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.name}!</p>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}
```

## Code Style

### Backend
- Use `PrismaClient` for all database operations
- Always use `try/catch` and call `next(error)`
- Use `AuthRequest` type for authenticated routes
- Validate input and throw `AppError` for validation failures
- Use async/await (not promises)

### Frontend
- Use functional components with hooks
- Use TanStack Query for server state
- Use Zustand for client state
- Follow Tailwind utility classes for styling
- Use the custom CSS classes from `index.css`: `.btn`, `.btn-primary`, `.input`, `.card`

### TypeScript
- Define types in `types/index.ts` (frontend) or controller files (backend)
- Use `interface` for object shapes
- Use `type` for unions and primitives
- Avoid `any` - use `unknown` if necessary

## File Organization

```
backend/src/
├── controllers/       # Business logic for each resource
├── middleware/        # Auth, error handling, validation
├── routes/           # Route definitions (thin layer)
├── utils/            # Helper functions (JWT, etc.)
└── index.ts          # Express app setup

frontend/src/
├── api/              # API client functions (optional)
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Axios, utilities
├── pages/            # Page-level components
├── stores/           # Zustand stores
└── types/            # TypeScript definitions
```

## Testing Locally

### Test Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Me (use token from login)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

### Test Events API
```bash
# List events
curl http://localhost:3000/api/events \
  -H "Authorization: Bearer <your-token>"

# Create event
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "worship",
    "title": "Test Event",
    "date_start": "2025-07-01T19:00:00Z",
    "date_end": "2025-07-01T21:00:00Z"
  }'
```

## Deployment Prep

### Environment Variables
Update these in production:
- `JWT_SECRET` - Use a strong random string
- `JWT_REFRESH_SECRET` - Use a different strong random string
- `DATABASE_URL` - Production PostgreSQL URL
- `NODE_ENV=production`

### Build for Production
```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist

# Backend
cd backend
npm run build
# Output: backend/dist
```

### Database Migrations
```bash
# Run migrations in production
cd backend
npx prisma migrate deploy
```

## Useful Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **React Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Express**: https://expressjs.com/
- **TypeScript**: https://www.typescriptlang.org/docs

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
cd backend
npm run prisma:generate
```

### "Property 'user' does not exist on type 'Request'"
Import `AuthRequest` instead of `Request`:
```typescript
import { AuthRequest } from '../middleware/auth'
```

### Frontend 404 on API calls
Check that Vite proxy is configured in `vite.config.ts` and backend is running on port 3000.

### Database connection errors
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in backend/.env
3. Try connecting manually: `psql $DATABASE_URL`

## Next Features to Build

See README.md "Next Steps" section for prioritized feature list.

Quick wins:
1. **Populate Dashboard** - Show real upcoming events and tasks
2. **Event List Filters** - Add search and filter controls
3. **Task Kanban** - Drag-and-drop task board
4. **Event Creation Form** - Simple form to create events (before full wizard)

Larger features:
1. **Event Wizard** (6 steps)
2. **Event Detail Tabs** (Overview, Tasks, Files, etc.)
3. **Tour Daily Schedule** (Add/edit tour days)
4. **File Upload** (S3 or local storage)
