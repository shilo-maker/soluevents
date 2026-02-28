import { useState } from 'react'
import { UserPlus, Users as UsersIcon, Mail, Shield, X, Edit2, Save, Trash2, Loader2, Eye, EyeOff } from 'lucide-react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/authStore'
import Avatar from '@/components/Avatar'
import type { User } from '@/types'

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    org_role: 'member' as 'admin' | 'manager' | 'member',
  })

  const { data: users, isLoading } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser(editingUser?.id || '')
  const deleteUser = useDeleteUser()

  // Only allow admins to access this page
  if (currentUser?.org_role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can manage users.</p>
        </div>
      </div>
    )
  }

  const handleSaveUser = () => {
    if (!formData.name.trim() || !formData.email.trim()) return

    if (editingUser) {
      // For editing, only send password if it's been changed
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        org_role: formData.org_role,
      }
      if (formData.password) {
        updateData.password = formData.password
      }

      updateUser.mutate(updateData, {
        onSuccess: () => {
          setEditingUser(null)
          setShowAddUser(false)
          setFormData({ name: '', email: '', password: '', org_role: 'member' })
          setShowPassword(false)
        },
      })
    } else {
      if (!formData.password) return

      createUser.mutate(formData, {
        onSuccess: () => {
          setShowAddUser(false)
          setFormData({ name: '', email: '', password: '', org_role: 'member' })
          setShowPassword(false)
        },
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setShowAddUser(false)
    setFormData({ name: '', email: '', password: '', org_role: 'member' })
    setShowPassword(false)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      org_role: user.org_role as 'admin' | 'manager' | 'member',
    })
    setShowAddUser(true)
  }

  const handleDeleteUser = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate ${name}? They will no longer be able to access the system.`)) {
      deleteUser.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Add/Edit User Form */}
      {showAddUser && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingUser ? 'Edit User' : 'New User'}
            </h3>
            <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Enter user name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password {!editingUser && <span className="text-red-500">*</span>}
                {editingUser && <span className="text-sm text-gray-500 font-normal ml-2">(leave blank to keep current password)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder={editingUser ? 'Enter new password (optional)' : 'Enter password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.org_role}
                onChange={(e) => setFormData({ ...formData, org_role: e.target.value as 'admin' | 'manager' | 'member' })}
                className="input"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.org_role === 'admin' && 'Full system access including user management'}
                {formData.org_role === 'manager' && 'Can manage events, tours, and tasks'}
                {formData.org_role === 'member' && 'Can view and participate in assigned tasks'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveUser}
                disabled={
                  !formData.name.trim() ||
                  !formData.email.trim() ||
                  (!editingUser && !formData.password) ||
                  createUser.isPending ||
                  updateUser.isPending
                }
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingUser ? 'Update' : 'Create'} User
              </button>
              <button onClick={handleCancelEdit} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-5 h-5 text-teal-600" />
          <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
          <span className="text-sm text-gray-500">({users?.length || 0})</span>
        </div>

        {users && users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar src={user.avatar_url} name={user.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-700 rounded-full capitalize mt-1">
                        {user.org_role}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Deactivate user"
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {user.email && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <a
                      href={`mailto:${user.email}`}
                      className="text-blue-600 hover:underline truncate"
                    >
                      {user.email}
                    </a>
                  </div>
                )}

                {user.id === currentUser?.id && (
                  <div className="mt-2 pt-2 border-t border-teal-200">
                    <span className="text-xs font-semibold text-teal-600">You</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No users found. Click "Add User" to create one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
