import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import api from '@/lib/axios'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import Dashboard from './pages/Dashboard'
import EventsPage from './pages/events/EventsPage'
import EventDetailPage from './pages/events/EventDetailPage'
import NewEventWizard from './pages/events/NewEventWizard'
import EditSchedulePage from './pages/events/EditSchedulePage'
import EditRiderPage from './pages/events/EditRiderPage'
import EditTeamsPage from './pages/events/EditTeamsPage'
import ToursPage from './pages/tours/ToursPage'
import TourDetailPage from './pages/tours/TourDetailPage'
import TasksPage from './pages/tasks/TasksPage'
import ContactsPage from './pages/ContactsPage'
import UsersPage from './pages/UsersPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import WorkspaceSettingsPage from './pages/WorkspaceSettingsPage'

function RedirectToLogin() {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: location.pathname }} />
}

function App() {
  const { isAuthenticated } = useAuthStore()
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

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

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<RedirectToLogin />} />
      </Routes>
    )
  }

  return (
    <Layout>
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
        <Route path="/workspace/invite/:token" element={<AcceptInvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
