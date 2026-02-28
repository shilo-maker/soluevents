import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, hasHydrated } from './stores/authStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import api from '@/lib/axios'
import { Loader2 } from 'lucide-react'
import Layout from './components/Layout'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import PushNotificationPrompt from './components/PushNotificationPrompt'
import { useAppResume } from './hooks/useAppResume'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EventsPage = lazy(() => import('./pages/events/EventsPage'))
const EventDetailPage = lazy(() => import('./pages/events/EventDetailPage'))
const NewEventWizard = lazy(() => import('./pages/events/NewEventWizard'))
const EditSchedulePage = lazy(() => import('./pages/events/EditSchedulePage'))
const EditRiderPage = lazy(() => import('./pages/events/EditRiderPage'))
const EditTeamsPage = lazy(() => import('./pages/events/EditTeamsPage'))
const ToursPage = lazy(() => import('./pages/tours/ToursPage'))
const TourDetailPage = lazy(() => import('./pages/tours/TourDetailPage'))
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'))
const WorkspaceSettingsPage = lazy(() => import('./pages/WorkspaceSettingsPage'))
const UserSettingsPage = lazy(() => import('./pages/UserSettingsPage'))
const InvitationResponsePage = lazy(() => import('./pages/InvitationResponsePage'))
const MemberInviteResponsePage = lazy(() => import('./pages/MemberInviteResponsePage'))

function RedirectToLogin() {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

function App() {
  const { isAuthenticated } = useAuthStore()
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)
  const location = useLocation()
  useAppResume()

  // Wait for Zustand to restore auth from localStorage before rendering.
  // Prevents a brief flash of the login page on PWA cold launch.
  const [hydrated, setHydrated] = useState(hasHydrated)
  useEffect(() => {
    if (hydrated) return
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    // In case hydration already completed between the useState and useEffect
    if (hasHydrated()) setHydrated(true)
    return unsub
  }, [hydrated])

  useEffect(() => {
    if (isAuthenticated) {
      // Sync user profile (repairs stale workspace references server-side)
      api.get('/auth/me').then((res) => {
        const { setAuth } = useAuthStore.getState()
        const { accessToken, refreshToken } = useAuthStore.getState()
        if (accessToken && refreshToken) {
          setAuth(res.data, accessToken, refreshToken)
        }
      }).catch(() => {
        // /me failed — non-blocking, continue with cached user
      })
      loadWorkspaces()
    }
  }, [isAuthenticated, loadWorkspaces])

  if (!hydrated) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invitation/:token" element={<InvitationResponsePage />} />
          <Route path="*" element={<RedirectToLogin />} />
        </Routes>
      </Suspense>
    )
  }

  // Standalone pages rendered without Layout (sidebar/nav)
  if (location.pathname.startsWith('/invitation/')) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
        <Routes>
          <Route path="/invitation/:token" element={<InvitationResponsePage />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Layout>
      <PWAUpdatePrompt />
      <PushNotificationPrompt />
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<Navigate to="/events" replace />} />
          <Route path="/events/:id/edit" element={<NewEventWizard />} />
          <Route path="/events/:id/schedule" element={<EditSchedulePage />} />
          <Route path="/events/:id/rider" element={<EditRiderPage />} />
          <Route path="/events/:id/teams" element={<EditTeamsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/tours/:id" element={<TourDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />
          <Route path="/user/settings" element={<UserSettingsPage />} />
          <Route path="/workspace/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/workspace/member-invite/:token" element={<MemberInviteResponsePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
