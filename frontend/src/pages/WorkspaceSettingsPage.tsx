import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Shield, Users, Link, Trash2, Copy, Loader2, Save, AlertTriangle, UserPlus, Search, Mail, Clock } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useWorkspaces, useGenerateInvite } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import {
  useWorkspaceDetails,
  useRenameWorkspace,
  useUpdateMemberRole,
  useRemoveMember,
  useDeleteWorkspace,
  useWorkspaceInvitations,
  useRevokeInvitation,
  useSearchUserByEmail,
  useSendMemberInvite,
  useWorkspaceMemberInvites,
  useRevokeMemberInvite,
} from '@/hooks/useWorkspaceSettings'
import type { WorkspaceMemberRole } from '@/types'

const ROLE_OPTIONS: WorkspaceMemberRole[] = ['admin', 'planner', 'leader', 'member']

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : 'An error occurred'
}

export default function WorkspaceSettingsPage() {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspaces()
  const currentUser = useAuthStore((s) => s.user)
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)
  const wsLoading = useWorkspaceStore((s) => s.isLoading)

  const wsId = activeWorkspace?.id
  const isOrg = activeWorkspace?.workspaceType === 'organization'
  const isOrgAdmin = isOrg && activeWorkspace?.role === 'admin'

  // Queries — any org member can view workspace details
  const { data, isLoading } = useWorkspaceDetails(isOrg ? wsId : undefined)
  const { data: invitations } = useWorkspaceInvitations(isOrgAdmin ? wsId : undefined)
  const { data: memberInvites } = useWorkspaceMemberInvites(isOrgAdmin ? wsId : undefined)

  // Mutations
  const renameMutation = useRenameWorkspace(wsId || '')
  const updateRoleMutation = useUpdateMemberRole(wsId || '')
  const removeMemberMutation = useRemoveMember(wsId || '')
  const deleteMutation = useDeleteWorkspace()
  const inviteMutation = useGenerateInvite()
  const revokeMutation = useRevokeInvitation(wsId || '')
  const sendMemberInviteMutation = useSendMemberInvite(wsId || '')
  const revokeMemberInviteMutation = useRevokeMemberInvite(wsId || '')

  // Local state
  const [name, setName] = useState('')
  const [nameInitialized, setNameInitialized] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Add Member state
  const [searchEmail, setSearchEmail] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>('member')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedEmail(searchEmail.trim().toLowerCase())
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchEmail])

  const { data: searchResult, isFetching: isSearching } = useSearchUserByEmail(wsId, debouncedEmail)

  // Initialize name from server data
  useEffect(() => {
    if (data?.workspace && !nameInitialized) {
      setName(data.workspace.name)
      setNameInitialized(true)
    }
  }, [data, nameInitialized])

  // Show loading while workspace store is still hydrating
  if (wsLoading || (!activeWorkspace && !wsId)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Access guard — only block personal workspaces
  if (!isOrg) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Available</h2>
          <p className="text-gray-600">
            Workspace settings are only available for organization workspaces.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const handleRename = async () => {
    if (!name.trim() || name.trim() === data?.workspace.name) return
    try {
      await renameMutation.mutateAsync(name.trim())
      await loadWorkspaces()
    } catch {
      // error shown below
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role })
    } catch {
      // error shown inline
    }
  }

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from this workspace?`)) return
    try {
      await removeMemberMutation.mutateAsync(userId)
    } catch {
      // error shown inline
    }
  }

  const handleGenerateInvite = async () => {
    if (!wsId) return
    try {
      const result = await inviteMutation.mutateAsync(wsId)
      const url = `${window.location.origin}/workspace/invite/${result.token}`
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        window.prompt('Copy this invite link:', url)
      }
    } catch {
      // error shown inline
    }
  }

  const handleCopyToken = async (token: string) => {
    const url = `${window.location.origin}/workspace/invite/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      window.prompt('Copy this invite link:', url)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeMutation.mutateAsync(inviteId)
    } catch {
      // error shown inline
    }
  }

  const handleDelete = async () => {
    if (!wsId || !data?.workspace) return
    const confirmed = window.confirm(
      `Delete "${data.workspace.name}"? This action cannot be undone. All workspace data will be permanently removed.`
    )
    if (!confirmed) return
    try {
      await deleteMutation.mutateAsync(wsId)
      await loadWorkspaces()
      navigate('/')
    } catch {
      // error shown inline
    }
  }

  const handleSendMemberInvite = async () => {
    if (!debouncedEmail) return
    try {
      await sendMemberInviteMutation.mutateAsync({ email: debouncedEmail, role: inviteRole })
      setSearchEmail('')
      setDebouncedEmail('')
      setInviteRole('member')
    } catch {
      // error shown inline
    }
  }

  const handleRevokeMemberInvite = async (inviteId: string) => {
    try {
      await revokeMemberInviteMutation.mutateAsync(inviteId)
    } catch {
      // error shown inline
    }
  }

  const nameChanged = name.trim() !== (data?.workspace.name || '')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          {isOrgAdmin ? <Settings className="w-8 h-8" /> : <Users className="w-8 h-8" />}
          {isOrgAdmin ? 'Workspace Settings' : 'Workspace Members'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isOrgAdmin ? 'Manage your workspace configuration and members' : 'View members in your workspace'}
        </p>
      </div>

      {/* General — admin only */}
      {isOrgAdmin && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="input flex-1"
              placeholder="Workspace name"
            />
            <button
              onClick={handleRename}
              disabled={!nameChanged || renameMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {renameMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
          {renameMutation.isError && (
            <p className="text-sm text-red-500 mt-2">{errorMessage(renameMutation.error)}</p>
          )}
          {renameMutation.isSuccess && (
            <p className="text-sm text-green-600 mt-2">Workspace renamed successfully</p>
          )}
        </div>
      )}

      {/* Add Member — admin only */}
      {isOrgAdmin && <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
        </div>

        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email address..."
              className="input pl-9 w-full"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as WorkspaceMemberRole)}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {isSearching && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching...
          </div>
        )}

        {searchResult && !isSearching && debouncedEmail && (
          <div className="rounded-lg border border-gray-200 p-3">
            {searchResult.found ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(searchResult.user?.name || searchResult.user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {searchResult.user?.name || searchResult.user?.username || searchResult.user?.email}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{searchResult.user?.email}</div>
                  </div>
                </div>
                <div className="shrink-0">
                  {searchResult.alreadyMember ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      Already a member
                    </span>
                  ) : searchResult.alreadyInvited ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                      Already invited
                    </span>
                  ) : (
                    <button
                      onClick={handleSendMemberInvite}
                      disabled={sendMemberInviteMutation.isPending}
                      className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {sendMemberInviteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Invite
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-1">
                No user found with this email address
              </p>
            )}
          </div>
        )}

        {sendMemberInviteMutation.isError && (
          <p className="text-sm text-red-500 mt-2">{errorMessage(sendMemberInviteMutation.error)}</p>
        )}
        {sendMemberInviteMutation.isSuccess && (
          <p className="text-sm text-green-600 mt-2">Invitation sent successfully!</p>
        )}
      </div>}

      {/* Members */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Members</h2>
          <span className="text-sm text-gray-500">({data?.members.length || 0})</span>
        </div>

        {isOrgAdmin && (updateRoleMutation.isError || removeMemberMutation.isError) && (
          <p className="text-sm text-red-500 mb-3">
            {errorMessage(updateRoleMutation.error || removeMemberMutation.error)}
          </p>
        )}

        <div className="space-y-2">
          {data?.members.map((member) => {
            const isCurrentUser = member.userId === currentUser?.id
            const displayName =
              member.user.name || member.user.username || member.user.email

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-purple-600 font-semibold">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{member.user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOrgAdmin ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                        disabled={isCurrentUser || updateRoleMutation.isPending}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      {!isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, displayName)}
                          disabled={removeMemberMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-600">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pending Invites */}
        {memberInvites && memberInvites.length > 0 && (
          <>
            <div className="mt-6 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700">Pending Invites</h3>
              <span className="text-xs text-gray-500">({memberInvites.length})</span>
            </div>

            {revokeMemberInviteMutation.isError && (
              <p className="text-sm text-red-500 mb-2">{errorMessage(revokeMemberInviteMutation.error)}</p>
            )}

            <div className="space-y-2">
              {memberInvites.map((inv) => {
                const displayName =
                  inv.invitedUser?.name || inv.invited_email.split('@')[0]

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50/60 opacity-70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate flex items-center gap-2">
                          {displayName}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                            Pending
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{inv.invited_email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-600">
                        {inv.role}
                      </span>
                      <button
                        onClick={() => handleRevokeMemberInvite(inv.id)}
                        disabled={revokeMemberInviteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Revoke invite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Invite Links — admin only */}
      {isOrgAdmin && <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Invite Links</h2>
          </div>
          <button
            onClick={handleGenerateInvite}
            disabled={inviteMutation.isPending}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {inviteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link className="w-4 h-4" />
            )}
            Generate Invite
          </button>
        </div>

        {inviteMutation.isError && (
          <p className="text-sm text-red-500 mb-3">{errorMessage(inviteMutation.error)}</p>
        )}
        {inviteMutation.isSuccess && (
          <p className="text-sm text-green-600 mb-3">Invite link generated and copied!</p>
        )}

        {invitations && invitations.length > 0 ? (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-gray-600 truncate">
                    ...{inv.token.slice(-12)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {inv.creator && <span>by {inv.creator.name || inv.creator.email}</span>}
                    {inv.expiresAt && (
                      <span className="ml-2">
                        expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {inv.maxUses != null && (
                      <span className="ml-2">
                        {inv.usageCount}/{inv.maxUses} uses
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopyToken(inv.token)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                    title={copiedToken === inv.token ? 'Copied!' : 'Copy link'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    disabled={revokeMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Revoke"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No active invite links. Generate one to invite members.
          </p>
        )}
      </div>}

      {/* Danger Zone — admin only */}
      {isOrgAdmin && <div className="card border-2 border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete this workspace and all associated data. This action cannot be undone.
        </p>
        {deleteMutation.isError && (
          <p className="text-sm text-red-500 mb-3">{errorMessage(deleteMutation.error)}</p>
        )}
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {deleteMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete Workspace
        </button>
      </div>}
    </div>
  )
}
