import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Building2, Check, Plus, ChevronDown, Link, Loader2, Settings, Users } from 'lucide-react'
import { useWorkspaces, useSwitchWorkspace, useCreateWorkspace, useGenerateInvite } from '@/hooks/useWorkspaces'
import type { Workspace } from '@/types'

function WorkspaceIcon({ type }: { type: string }) {
  return type === 'personal' ? (
    <User className="w-4 h-4" />
  ) : (
    <Building2 className="w-4 h-4" />
  )
}

export default function WorkspaceSwitcher() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { workspaces, activeWorkspace } = useWorkspaces()
  const switchMutation = useSwitchWorkspace()
  const createMutation = useCreateWorkspace()
  const inviteMutation = useGenerateInvite()

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const closeDropdown = useCallback(() => {
    setOpen(false)
    setCreating(false)
    setNewName('')
  }, [])

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDropdown()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, closeDropdown])

  // Focus input when creating
  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const handleSwitch = async (ws: Workspace) => {
    if (ws.id === activeWorkspace?.id) {
      setOpen(false)
      return
    }
    try {
      await switchMutation.mutateAsync(ws.id)
      setOpen(false)
      navigate('/events')
    } catch {
      // error is available via switchMutation.error — keep dropdown open so user sees it
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const ws = await createMutation.mutateAsync(newName.trim())
      setNewName('')
      setCreating(false)
      setOpen(false)
      try {
        await switchMutation.mutateAsync(ws.id)
      } catch {
        // created but switch failed — workspace still appears in list
      }
    } catch {
      // creation failed — keep dropdown open so user sees error and can retry
    }
  }

  const handleInvite = async (e: React.MouseEvent, wsId: string) => {
    e.stopPropagation()
    try {
      const result = await inviteMutation.mutateAsync(wsId)
      const url = `${window.location.origin}/workspace/invite/${result.token}`
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // Clipboard not available (non-HTTPS or old browser)
        window.prompt(t('workspace.copyLink'), url)
      }
      setCopiedId(wsId)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // invite generation failed
    }
  }

  if (!activeWorkspace) {
    return <div className="w-32 h-9 bg-gray-100 rounded-lg animate-pulse" />
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          if (!open) {
            // Reset stale errors when opening
            switchMutation.reset()
            createMutation.reset()
            inviteMutation.reset()
          }
          setOpen(!open)
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-all duration-200"
      >
        <WorkspaceIcon type={activeWorkspace.workspaceType} />
        <span className="max-w-[180px] truncate">{activeWorkspace.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50" role="menu">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('workspaceSwitcher.workspaces')}
          </div>

          {workspaces.map((ws) => (
            <button
              key={ws.id}
              role="menuitem"
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg cursor-pointer transition-colors text-left ${
                ws.is_active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleSwitch(ws)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <WorkspaceIcon type={ws.workspaceType} />
                <span className="text-sm font-medium truncate">{ws.name}</span>
                {ws.role && ws.role !== 'member' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize shrink-0">
                    {ws.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {ws.is_active && ws.workspaceType === 'organization' && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      closeDropdown()
                      navigate('/workspace/settings')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        closeDropdown()
                        navigate('/workspace/settings')
                      }
                    }}
                    className="p-1 rounded hover:bg-teal-100 text-gray-400 hover:text-teal-600 transition-colors"
                    title={ws.role === 'admin' ? t('workspace.workspaceSettings') : t('workspace.workspaceMembers')}
                  >
                    {ws.role === 'admin' ? <Settings className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  </span>
                )}
                {ws.workspaceType === 'organization' && (ws.role === 'admin' || ws.role === 'planner') && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleInvite(e, ws.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(e as any, ws.id) }}
                    className="p-1 rounded hover:bg-teal-100 text-gray-400 hover:text-teal-600 transition-colors"
                    title={copiedId === ws.id ? t('workspace.copied') : t('workspace.copyLink')}
                  >
                    {inviteMutation.isPending && inviteMutation.variables === ws.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
                {ws.is_active && <Check className="w-4 h-4 text-teal-600" />}
              </div>
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setNewName('')
                    }
                  }}
                  placeholder={t('workspaceSwitcher.workspaceNamePlaceholder')}
                  maxLength={100}
                  className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || createMutation.isPending}
                    className="flex-1 text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? t('workspaceSwitcher.creating') : t('common.create')}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewName('') }}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('workspaceSwitcher.newWorkspace')}
              </button>
            )}
          </div>

          {copiedId && (
            <div className="px-3 py-1.5 text-xs text-green-600 text-center">
              {t('workspaceSwitcher.inviteLinkCopied')}
            </div>
          )}

          {(switchMutation.isError || createMutation.isError || inviteMutation.isError) && (
            <div className="px-3 py-1.5 text-xs text-red-500 text-center">
              {[
                switchMutation.isError && t('workspaceSwitcher.failedSwitch'),
                createMutation.isError && t('workspaceSwitcher.failedCreate'),
                inviteMutation.isError && t('workspaceSwitcher.failedInvite'),
              ].filter(Boolean).join('. ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
