import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
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

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
