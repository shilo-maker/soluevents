/**
 * SoluFlow Integration API Service
 *
 * This service provides methods to interact with the SoluFlow API
 * for searching songs, getting song details, and creating services.
 */

// Integration API URL for search (uses API key)
const SOLUFLOW_INTEGRATION_URL = import.meta.env.VITE_SOLUFLOW_INTEGRATION_URL || 'http://localhost:5002/api/integration'
const API_KEY = import.meta.env.VITE_SOLUFLOW_API_KEY

// Main API URL for auth and service creation
const SOLUFLOW_API_URL = import.meta.env.VITE_SOLUFLOW_API_URL || 'http://localhost:5002/api'

// Service Account Credentials
const SERVICE_EMAIL = import.meta.env.VITE_SOLUFLOW_SERVICE_EMAIL || 'EventsApp@soluisrael.org'
const SERVICE_PASSWORD = import.meta.env.VITE_SOLUFLOW_SERVICE_PASSWORD || '1397152535Bh@'

// Cache for service account token
let serviceAccountToken: string | null = null

export interface SoluFlowSong {
  id: number
  title: string
  authors?: string
  key?: string
  bpm?: number
  timeSignature?: string
  code?: string
  listenUrl?: string
  creator?: string
  workspace?: string
}

export interface SoluFlowService {
  id: number
  name: string
  date: string
  code: string
  leader: string
  songs: Array<{
    id: number
    title: string
    authors?: string
    key?: string
    bpm?: number
    position: number
    transposition: number
  }>
  shareUrl: string
}

/**
 * Search for songs in SoluFlow database
 * @param query - Search query (searches title and authors)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of songs matching the search query
 */
export const searchSongs = async (query: string, limit: number = 10): Promise<SoluFlowSong[]> => {
  try {
    if (!query || query.length < 2) {
      return []
    }

    const response = await fetch(
      `${SOLUFLOW_INTEGRATION_URL}/songs/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'X-API-Key': API_KEY || ''
        }
      }
    )

    if (!response.ok) {
      console.error('SoluFlow search failed:', response.status)
      return []
    }

    const data = await response.json()
    return data.success ? data.songs : []
  } catch (error) {
    console.error('SoluFlow search error:', error)
    return []
  }
}

/**
 * Get detailed information about a specific song
 * @param songId - The SoluFlow song ID
 * @returns Song details including full content, or null if not found
 */
export const getSongDetails = async (songId: number): Promise<SoluFlowSong | null> => {
  try {
    const response = await fetch(
      `${SOLUFLOW_INTEGRATION_URL}/songs/${songId}`,
      {
        headers: {
          'X-API-Key': API_KEY || ''
        }
      }
    )

    if (!response.ok) {
      console.error('SoluFlow get song failed:', response.status)
      return null
    }

    const data = await response.json()
    return data.success ? data.song : null
  } catch (error) {
    console.error('SoluFlow get song error:', error)
    return null
  }
}

/**
 * Authenticate with SoluFlow using service account credentials
 * @returns JWT token for authenticated requests
 */
const authenticateServiceAccount = async (): Promise<string | null> => {
  // Return cached token if available
  if (serviceAccountToken) {
    return serviceAccountToken
  }

  try {
    const response = await fetch(`${SOLUFLOW_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: SERVICE_EMAIL,
        password: SERVICE_PASSWORD
      })
    })

    if (!response.ok) {
      console.error('SoluFlow authentication failed:', response.status)
      const errorData = await response.json()
      console.error('Auth error details:', errorData)
      return null
    }

    const data = await response.json()
    if (data.token) {
      serviceAccountToken = data.token
      console.log('✅ Successfully authenticated with SoluFlow service account')
      console.log('Active Workspace:', data.activeWorkspace?.name)
      return serviceAccountToken
    }

    console.error('Authentication response missing token:', data)
    return null
  } catch (error) {
    console.error('SoluFlow authentication error:', error)
    return null
  }
}

/**
 * Add songs to an existing service
 * @param serviceId - The service ID
 * @param songIds - Array of song IDs to add
 * @param token - Authentication token
 * @returns true if successful, false otherwise
 */
const addSongsToService = async (
  serviceId: number,
  songIds: number[],
  token: string
): Promise<boolean> => {
  try {
    const endpoint = `${SOLUFLOW_API_URL}/services/${serviceId}/songs`
    console.log(`🎼 Adding ${songIds.length} songs to service ${serviceId}...`)

    let successCount = 0

    // Add songs individually with proper song_id field
    for (let i = 0; i < songIds.length; i++) {
      const songId = songIds[i]
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            song_id: songId,
            position: i,
            transposition: 0
          })
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`✅ Added song ${songId} (position ${i}):`, result)

          // Verify the song was actually linked
          if (result.song_id && result.song_id === songId) {
            successCount++
          } else {
            console.warn(`⚠️ Song ${songId} added but song_id is ${result.song_id}`)
          }
        } else {
          const error = await response.json()
          console.error(`❌ Failed to add song ${songId}:`, error)
        }
      } catch (err) {
        console.error(`❌ Error adding song ${songId}:`, err)
      }
    }

    const allSuccess = successCount === songIds.length
    console.log(`📊 Added ${successCount}/${songIds.length} songs successfully`)
    return allSuccess
  } catch (error) {
    console.error('Error adding songs to service:', error)
    return false
  }
}

/**
 * Create a worship service in SoluFlow using service account
 * @param eventData - Event data including name, date, and song IDs
 * @returns Created service details, or null if creation failed
 */
export const createSoluFlowService = async (
  eventData: {
    name: string
    date: string
    songIds: number[]
    notes?: string
    workspaceId?: number
  }
): Promise<SoluFlowService | null> => {
  try {
    // Authenticate with service account
    const token = await authenticateServiceAccount()
    if (!token) {
      throw new Error('Failed to authenticate with SoluFlow service account')
    }

    // Parse the ISO datetime into separate date and time
    const datetime = new Date(eventData.date)
    const dateOnly = datetime.toISOString().split('T')[0] // "2025-12-01"
    const timeOnly = datetime.toTimeString().slice(0, 5) // "17:00" (HH:MM format)

    const payload = {
      title: eventData.name,
      date: dateOnly,
      time: timeOnly,
      song_ids: eventData.songIds,
      notes: eventData.notes || '',
      workspace_id: eventData.workspaceId || 3 // Default to SoluTeam workspace
    }

    console.log('📤 Sending to SoluFlow API:', payload)
    console.log('📅 Parsed datetime:', { original: eventData.date, date: dateOnly, time: timeOnly })

    const response = await fetch(
      `${SOLUFLOW_API_URL}/services`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('SoluFlow create service failed:', response.status, errorData)

      // If auth error, clear token and retry once
      if (response.status === 401 || response.status === 403) {
        serviceAccountToken = null
        return createSoluFlowService(eventData) // Retry once
      }

      return null
    }

    const data = await response.json()
    const service = data.service || data

    if (service && service.id) {
      // Construct share URL if not provided
      if (!service.shareUrl && service.code) {
        service.shareUrl = `https://soluflow.app/service/code/${service.code}`
      }

      console.log('✅ Successfully created service in SoluFlow:', service)
      console.log('📋 Full service response:', JSON.stringify(service, null, 2))
      console.log('🎵 Songs in service:', service.songs || service.ServiceSongs || service.setlist || 'No songs property found')

      // If songs were provided, add them to the service
      if (eventData.songIds && eventData.songIds.length > 0) {
        console.log('🎼 Adding songs to service...')
        const songsAdded = await addSongsToService(service.id, eventData.songIds, token)
        if (songsAdded) {
          console.log('✅ Songs added successfully')
        } else {
          console.warn('⚠️ Failed to add songs to service')
        }
      }

      return service
    }

    console.error('Service creation response missing service:', data)
    return null
  } catch (error) {
    console.error('SoluFlow create service error:', error)
    // Clear token on error
    serviceAccountToken = null
    return null
  }
}

/**
 * Health check to verify SoluFlow API is accessible
 * @returns true if API is accessible, false otherwise
 */
export const checkSoluFlowHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${SOLUFLOW_INTEGRATION_URL}/health`)
    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('SoluFlow health check failed:', error)
    return false
  }
}
