import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import NotificationBell from './NotificationBell'
import {
  Home,
  Calendar,
  MapPin,
  CheckSquare,
  Users,
  UserCog,
  LogOut,
  Settings,
} from 'lucide-react'
import Avatar from './Avatar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Tours', href: '/tours', icon: MapPin },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Contacts', href: '/contacts', icon: Users },
    ...(user?.org_role === 'admin' ? [{ name: 'Users', href: '/users', icon: UserCog }] : []),
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/20">
            <h1 className="text-xl font-bold text-white">✨ SoluPlan</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-white text-purple-700 shadow-lg transform scale-105'
                      : 'text-white/90 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-white/20 bg-black/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar src={user?.avatar_url} name={user?.name || ''} size="md" className="shadow-lg" />
                <div className="ml-3">
                  <p className="text-sm font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-white/70 capitalize">{user?.org_role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/user/settings"
                  className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="User Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => clearAuth()}
                  className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center h-16 px-8 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
          <WorkspaceSwitcher />
          <div className="flex-1"></div>
          <NotificationBell />
        </div>

        {/* Page content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
