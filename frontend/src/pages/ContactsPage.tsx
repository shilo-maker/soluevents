import { useState, useMemo, useEffect } from 'react'
import { UserPlus, Mail, Phone, Briefcase, X, Edit2, Save, Trash2, Loader2, Search, Shield } from 'lucide-react'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/useContacts'
import { useUsers } from '@/hooks/useUsers'
import type { Contact, User } from '@/types'

type UnifiedContact = {
  id: string
  name: string
  nickname?: string
  email?: string
  phone?: string
  role?: string
  notes?: string
  isUser: boolean
  org_role?: string
  originalContact?: Contact
  originalUser?: User
}

export default function ContactsPage() {
  const [showAddContact, setShowAddContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    role: '',
    notes: '',
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: contacts, isLoading: contactsLoading } = useContacts()
  const { data: users, isLoading: usersLoading } = useUsers()
  const createContact = useCreateContact()
  const updateContact = useUpdateContact(editingContact?.id || '')
  const deleteContact = useDeleteContact()

  // Combine users and contacts into a unified list
  const allContacts = useMemo<UnifiedContact[]>(() => {
    const userContacts: UnifiedContact[] = users?.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: undefined,
      role: undefined,
      notes: undefined,
      isUser: true,
      org_role: user.org_role,
      originalUser: user,
    })) || []

    const externalContacts: UnifiedContact[] = contacts?.map(contact => ({
      id: contact.id,
      name: contact.name,
      nickname: contact.nickname,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      notes: contact.notes,
      isUser: false,
      originalContact: contact,
    })) || []

    return [...userContacts, ...externalContacts].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [users, contacts])

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!debouncedSearch.trim()) return allContacts

    const query = debouncedSearch.toLowerCase()
    return allContacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.nickname?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.role?.toLowerCase().includes(query) ||
      contact.org_role?.toLowerCase().includes(query)
    )
  }, [allContacts, debouncedSearch])

  const handleSaveContact = () => {
    if (!formData.name.trim()) return

    if (editingContact) {
      updateContact.mutate(formData, {
        onSuccess: () => {
          setEditingContact(null)
          setShowAddContact(false)
          setFormData({ name: '', nickname: '', email: '', phone: '', role: '', notes: '' })
        },
      })
    } else {
      createContact.mutate(formData, {
        onSuccess: () => {
          setShowAddContact(false)
          setFormData({ name: '', nickname: '', email: '', phone: '', role: '', notes: '' })
        },
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingContact(null)
    setShowAddContact(false)
    setFormData({ name: '', nickname: '', email: '', phone: '', role: '', notes: '' })
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      nickname: contact.nickname || '',
      email: contact.email || '',
      phone: contact.phone || '',
      role: contact.role || '',
      notes: contact.notes || '',
    })
    setShowAddContact(true)
  }

  const handleDeleteContact = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      deleteContact.mutate(id)
    }
  }

  if (contactsLoading || usersLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            {allContacts.length} total ({users?.length || 0} users, {contacts?.length || 0} contacts)
          </p>
        </div>
        <button
          onClick={() => setShowAddContact(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      {/* Search Box */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, or role..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Add/Edit Contact Form */}
      {showAddContact && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingContact ? 'Edit Contact' : 'New Contact'}
            </h3>
            <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nickname</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="input"
                  placeholder="e.g., Johnny, DJ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input"
                placeholder="e.g., Sound Engineer, Venue Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input"
                rows={3}
                placeholder="Additional notes about this contact"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveContact}
                disabled={!formData.name.trim() || createContact.isPending || updateContact.isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingContact ? 'Update' : 'Save'} Contact
              </button>
              <button onClick={handleCancelEdit} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Contacts List */}
      <div className="card">
        {filteredContacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${
                  contact.isUser
                    ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
                    : 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{contact.name}</h3>
                      {contact.nickname && (
                        <p className="text-xs text-gray-500 truncate">"{contact.nickname}"</p>
                      )}
                      {contact.isUser && contact.org_role && (
                        <div className="flex items-center gap-1 mt-1">
                          <Shield className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 capitalize">
                            {contact.org_role}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {!contact.isUser && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditContact(contact.originalContact!)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit contact"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {contact.role && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{contact.role}</span>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:underline truncate"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}

                {contact.notes && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{contact.notes}</p>
                )}

                {contact.isUser && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
                      <Shield className="w-3 h-3" />
                      Registered User
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {debouncedSearch ? (
              <p>No contacts found matching "{debouncedSearch}"</p>
            ) : (
              <p>No contacts yet. Click "Add Contact" to create one.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
