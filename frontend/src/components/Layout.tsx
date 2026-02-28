import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useSocketConnection } from '@/hooks/useSocket'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import NotificationBell from './NotificationBell'
import logoSm from '@/assets/logo-sm.png'
import {
  Home,
  Calendar,
  MapPin,
  CheckSquare,
  Users,
  UserCog,
  LogOut,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import Avatar from './Avatar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  useSocketConnection()
  useNotificationSocket()
  const { t } = useTranslation()

  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: Home },
    { name: t('nav.events'), href: '/events', icon: Calendar },
    { name: t('nav.tours'), href: '/tours', icon: MapPin },
    { name: t('nav.tasks'), href: '/tasks', icon: CheckSquare },
    { name: t('nav.contacts'), href: '/contacts', icon: Users },
    ...(user?.org_role === 'admin' ? [{ name: t('nav.users'), href: '/users', icon: UserCog }] : []),
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 start-0 w-64 bg-gradient-to-br from-teal-800 via-cyan-600 to-emerald-600 gradient-animate shadow-2xl z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <img src={logoSm} alt="SoluPlan" className="w-8 h-8 rounded-lg" />
              <h1 className="text-xl font-bold text-white">SoluPlan</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-white text-teal-700 shadow-lg transform scale-105'
                      : 'text-white/90 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 me-3" />
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
                <div className="ms-3">
                  <p className="text-sm font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-white/70 capitalize">{user?.org_role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/user/settings"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title={t('nav.userSettings')}
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => clearAuth()}
                  className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ps-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <WorkspaceSwitcher />
          </div>
          <NotificationBell />
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
