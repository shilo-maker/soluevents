/**
 * Test script to verify SoluFlow service creation using service account
 *
 * This script tests the complete flow:
 * 1. Authenticate with service account
 * 2. Create a test service with sample songs
 * 3. Display the created service URL
 */

const SOLUFLOW_API_URL = 'https://soluflow.app/api'
const SERVICE_EMAIL = 'EventsApp@soluisrael.org'
const SERVICE_PASSWORD = '1397152535Bh@'

async function authenticateServiceAccount() {
  console.log('🔐 Authenticating with SoluFlow service account...')

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

  const data = await response.json()

  if (!response.ok || !data.token) {
    console.error('❌ Authentication failed:', data)
    throw new Error('Failed to authenticate')
  }

  console.log('✅ Successfully authenticated')
  console.log('User ID:', data.user?.id)
  console.log('Workspace ID:', data.user?.workspace_id || data.user?.workspaceId)
  console.log('Active Workspace:', data.activeWorkspace?.name)
  console.log('Workspace Type:', data.activeWorkspace?.workspace_type)

  return data.token
}

async function createTestService(token) {
  console.log('\n🎵 Creating test service...')

  const testService = {
    title: 'Test Service from SoluEvents',
    date: new Date().toISOString(),
    workspace_id: 3, // SoluTeam workspace
    song_ids: [1, 2, 3], // Replace with actual song IDs from your SoluFlow
    notes: 'This is a test service created by SoluEvents integration'
  }

  const response = await fetch(`${SOLUFLOW_API_URL}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testService)
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('❌ Service creation failed:', data)
    throw new Error('Failed to create service')
  }

  // Handle both response formats (with or without success field)
  const service = data.service || data

  // Construct share URL if not provided
  if (!service.shareUrl && service.code) {
    service.shareUrl = `https://soluflow.app/service/code/${service.code}`
  }

  console.log('✅ Successfully created service')
  console.log('Service ID:', service?.id)
  console.log('Service Code:', service?.code)
  console.log('Service URL:', service?.shareUrl)

  return service
}

async function main() {
  try {
    console.log('🚀 Testing SoluFlow Service Creation\n')
    console.log('Environment: Production (soluflow.app)')
    console.log('Service Account:', SERVICE_EMAIL)
    console.log('=' .repeat(50))

    const token = await authenticateServiceAccount()
    const service = await createTestService(token)

    console.log('\n' + '=' .repeat(50))
    console.log('✅ TEST SUCCESSFUL!')
    console.log('=' .repeat(50))
    console.log('\nYou can view the created service at:')
    console.log(service.shareUrl)

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message)
    process.exit(1)
  }
}

main()
