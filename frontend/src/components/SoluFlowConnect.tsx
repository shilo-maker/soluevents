import { useState } from 'react'
import { Music, X, ExternalLink, Check } from 'lucide-react'

interface SoluFlowConnectProps {
  onConnect?: (token: string) => void
}

export default function SoluFlowConnect({ onConnect }: SoluFlowConnectProps) {
  const [showModal, setShowModal] = useState(false)
  const [token, setToken] = useState('')
  const [isConnected, setIsConnected] = useState(() => {
    return !!localStorage.getItem('soluflowToken')
  })

  const handleConnect = () => {
    if (token.trim()) {
      localStorage.setItem('soluflowToken', token.trim())
      setIsConnected(true)
      setShowModal(false)
      setToken('')
      onConnect?.(token.trim())
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('soluflowToken')
    setIsConnected(false)
  }

  const handleOpenSoluFlow = () => {
    window.open('https://soluflow.app', '_blank')
  }

  return (
    <>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Connected to SoluFlow</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Music className="w-4 h-4" />
          Connect to SoluFlow
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Connect to SoluFlow</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                To create services in SoluFlow, you need to authenticate with your SoluFlow account.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">How to get your token:</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Log in to SoluFlow</li>
                  <li>Open browser DevTools (F12) → Console</li>
                  <li>Type: <code className="bg-blue-100 px-1 py-0.5 rounded">localStorage.getItem('token')</code></li>
                  <li>Copy the token (without quotes)</li>
                  <li>Paste it below</li>
                </ol>
                <button
                  onClick={handleOpenSoluFlow}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-3 hover:underline"
                >
                  Open SoluFlow
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SoluFlow Token
                </label>
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your SoluFlow token here..."
                  className="input w-full h-24 font-mono text-sm"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConnect}
                  disabled={!token.trim()}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
