import { useState, useEffect } from 'react'
import { Settings, Mail, Save, Send, Loader2, User } from 'lucide-react'
import { isAxiosError } from 'axios'
import {
  useUserEmailSettings,
  useUpdateUserEmailSettings,
  useTestUserEmailSettings,
} from '@/hooks/useUserSettings'
import { useAuthStore } from '@/stores/authStore'
import AvatarUpload from '@/components/AvatarUpload'
import api from '@/lib/axios'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : 'An error occurred'
}

export default function UserSettingsPage() {
  const { data: emailSettings, isLoading } = useUserEmailSettings()
  const updateMutation = useUpdateUserEmailSettings()
  const testMutation = useTestUserEmailSettings()
  const user = useAuthStore((s) => s.user)
  const patchUser = useAuthStore((s) => s.patchUser)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAvatarUpload = async (base64: string) => {
    if (!user) return
    setAvatarLoading(true)
    setAvatarMsg(null)
    try {
      await api.patch(`/users/${user.id}`, { avatar_url: base64 })
      patchUser({ avatar_url: base64 })
      setAvatarMsg({ type: 'success', text: 'Profile photo updated' })
    } catch (err) {
      setAvatarMsg({ type: 'error', text: errorMessage(err) })
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!user) return
    setAvatarLoading(true)
    setAvatarMsg(null)
    try {
      await api.patch(`/users/${user.id}`, { avatar_url: null })
      patchUser({ avatar_url: null })
      setAvatarMsg({ type: 'success', text: 'Profile photo removed' })
    } catch (err) {
      setAvatarMsg({ type: 'error', text: errorMessage(err) })
    } finally {
      setAvatarLoading(false)
    }
  }

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (emailSettings && !initialized) {
      setSmtpHost(emailSettings.smtp_host || '')
      setSmtpPort(String(emailSettings.smtp_port ?? 587))
      setSmtpSecure(emailSettings.smtp_secure)
      setSmtpUser(emailSettings.smtp_user || '')
      setInitialized(true)
    }
  }, [emailSettings, initialized])

  const handleSave = async () => {
    testMutation.reset()
    const port = Number(smtpPort)
    if (smtpHost && (isNaN(port) || port < 1 || port > 65535)) {
      return
    }
    try {
      const payload: Record<string, any> = {
        smtp_host: smtpHost,
        smtp_port: port,
        smtp_secure: smtpSecure,
        smtp_user: smtpUser,
      }
      if (smtpPass) {
        payload.smtp_pass = smtpPass
      }
      await updateMutation.mutateAsync(payload)
      setSmtpPass('')
    } catch {
      // error shown inline
    }
  }

  const handleTest = async () => {
    updateMutation.reset()
    try {
      await testMutation.mutateAsync()
    } catch {
      // error shown inline
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          User Settings
        </h1>
        <p className="text-gray-600 mt-1">Manage your personal settings</p>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="flex items-start gap-6">
          <AvatarUpload
            src={user?.avatar_url}
            name={user?.name || ''}
            onUpload={handleAvatarUpload}
            onRemove={handleAvatarRemove}
            loading={avatarLoading}
          />
          <div className="pt-1">
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.org_role}</p>
          </div>
        </div>

        {avatarMsg && (
          <p className={`text-sm mt-3 ${avatarMsg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {avatarMsg.text}
          </p>
        )}
      </div>

      {/* Email Settings */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Email Settings</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">
              Configure SMTP credentials so invitation emails are sent from your email account. These settings apply across all your workspaces.
            </p>

            <details className="mb-4 group">
              <summary className="text-sm text-purple-600 cursor-pointer hover:text-purple-700 font-medium">
                Gmail setup instructions
              </summary>
              <div className="mt-2 p-3 bg-purple-50 rounded-lg text-sm text-gray-700 space-y-1.5">
                <p><strong>1.</strong> Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline hover:text-purple-700">myaccount.google.com/security</a></p>
                <p><strong>2.</strong> Make sure <strong>2-Step Verification</strong> is turned on</p>
                <p><strong>3.</strong> Search for <strong>"App Passwords"</strong> in your Google Account settings</p>
                <p><strong>4.</strong> Create a new App Password (name it "SoluPlan" or anything you like)</p>
                <p><strong>5.</strong> Copy the 16-character password Google gives you</p>
                <p><strong>6.</strong> Use these settings below:</p>
                <ul className="list-disc list-inside ml-2 text-gray-600">
                  <li>SMTP Host: <code className="bg-white px-1 rounded">smtp.gmail.com</code></li>
                  <li>SMTP Port: <code className="bg-white px-1 rounded">587</code></li>
                  <li>SMTP User: your full Gmail address</li>
                  <li>SMTP Password: the 16-character App Password (not your Gmail password)</li>
                </ul>
              </div>
            </details>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="smtp-secure" className="text-sm font-medium text-gray-700">
                  Use SSL/TLS (port 465)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP User</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your@email.com"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={emailSettings?.has_password ? '••••••••  (password set)' : 'Enter password'}
                  className="input w-full"
                />
              </div>

            </div>

            {updateMutation.isError && (
              <p className="text-sm text-red-500 mt-3">{errorMessage(updateMutation.error)}</p>
            )}
            {updateMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-3">Email settings saved</p>
            )}
            {testMutation.isError && (
              <p className="text-sm text-red-500 mt-3">{errorMessage(testMutation.error)}</p>
            )}
            {testMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-3">{testMutation.data?.message}</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Test Email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
