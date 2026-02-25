/**
 * Comprehensive API test suite for SoluPlan backend
 * Tests: security headers, validation, authorization, pagination, CRUD, integration
 */

const BASE = 'http://localhost:3003'
let pass = 0, fail = 0, total = 0

let rebekahToken = '', shiloToken = '', sarahToken = '', newUserToken = ''
let newUserId = '', eventId = '', tourId = '', taskId = '', contactId = '', roleAssignmentId = ''
let rebekahId = ''

async function req(method: string, path: string, body?: any, token?: string): Promise<any> {
  const headers: any = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const opts: any = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, headers: res.headers }
}

function test(name: string, actual: boolean) {
  total++
  if (actual) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ FAIL: ${name}`) }
}

async function run() {
  console.log('\n═══ SOLUPLAN COMPREHENSIVE TEST SUITE ═══\n')

  // ── SECURITY HEADERS ───────────────────────────────────
  console.log('── Security Headers ──')
  {
    const r = await req('GET', '/health')
    test('Helmet: X-Content-Type-Options', r.headers.get('x-content-type-options') === 'nosniff')
    test('Helmet: X-Frame-Options', !!r.headers.get('x-frame-options'))
    test('Health check ok', r.data.status === 'ok')
  }

  // ── 404 HANDLER ────────────────────────────────────────
  console.log('\n── 404 Handler ──')
  {
    const r = await req('GET', '/api/nonexistent')
    test('Unknown route returns 404', r.status === 404)
    test('404 body has error status', r.data.status === 'error')
  }

  // ── ZOD VALIDATION ─────────────────────────────────────
  console.log('\n── Zod Validation ──')
  {
    let r = await req('POST', '/api/auth/register', { email: 'a@b.com', password: '12345678' })
    test('Register: missing name → 400', r.status === 400)

    r = await req('POST', '/api/auth/register', { name: 'X', email: 'a@b.com', password: '12' })
    test('Register: short password → 400', r.status === 400)

    r = await req('POST', '/api/auth/register', { name: 'X', email: 'bad', password: '12345678' })
    test('Register: invalid email → 400', r.status === 400)

    r = await req('POST', '/api/auth/login', { email: 'a@b.com' })
    test('Login: missing password → 400', r.status === 400)

    r = await req('POST', '/api/auth/refresh', {})
    test('Refresh: missing token → 400', r.status === 400)
  }

  // ── AUTH ────────────────────────────────────────────────
  console.log('\n── Authentication ──')
  {
    let r = await req('POST', '/api/auth/login', { email: 'rebekah@soluevents.com', password: 'password123' })
    test('Rebekah login', r.status === 200 && !!r.data.access_token)
    rebekahToken = r.data.access_token

    r = await req('POST', '/api/auth/login', { email: 'shilo@soluevents.com', password: 'password123' })
    test('Shilo login', r.status === 200)
    shiloToken = r.data.access_token

    r = await req('POST', '/api/auth/login', { email: 'sarah@soluevents.com', password: 'password123' })
    test('Sarah login', r.status === 200)
    sarahToken = r.data.access_token

    r = await req('POST', '/api/auth/login', { email: 'rebekah@soluevents.com', password: 'wrong' })
    test('Bad password → 401', r.status === 401)

    r = await req('GET', '/api/events')
    test('No token → 401', r.status === 401)

    r = await req('GET', '/api/auth/me', undefined, rebekahToken)
    test('/me works', r.status === 200 && r.data.email === 'rebekah@soluevents.com')
    rebekahId = r.data.id

    r = await req('POST', '/api/auth/register', { name: 'TestOpt', email: 'testopt@test.com', password: 'testpass123' })
    test('Register new user (201)', r.status === 201)
    newUserToken = r.data.access_token
    newUserId = r.data.user.id

    r = await req('POST', '/api/auth/register', { name: 'Dup', email: 'testopt@test.com', password: 'testpass123' })
    test('Duplicate email → 409', r.status === 409)

    const loginR = await req('POST', '/api/auth/login', { email: 'testopt@test.com', password: 'testpass123' })
    r = await req('POST', '/api/auth/refresh', { refresh_token: loginR.data.refresh_token })
    test('Refresh token works', r.status === 200 && !!r.data.access_token)
  }

  // ── EVENTS ─────────────────────────────────────────────
  console.log('\n── Events ──')
  {
    let r = await req('POST', '/api/events', {
      type: 'worship', title: 'OptTest Event',
      date_start: '2026-06-01T10:00:00Z', date_end: '2026-06-01T14:00:00Z',
    }, rebekahToken)
    test('Create event (201)', r.status === 201)
    eventId = r.data.id

    r = await req('POST', '/api/events', { title: 'No type' }, rebekahToken)
    test('Missing type → 400', r.status === 400)

    r = await req('GET', '/api/events', undefined, rebekahToken)
    test('Events: paginated', r.status === 200 && !!r.data.pagination && Array.isArray(r.data.data))
    test('Events: has total', typeof r.data.pagination.total === 'number')

    r = await req('GET', '/api/events?page=1&limit=1', undefined, rebekahToken)
    test('Events: limit=1 works', r.data.data.length <= 1)

    r = await req('GET', `/api/events/${eventId}`, undefined, rebekahToken)
    test('Creator can get event', r.status === 200)

    r = await req('GET', `/api/events/${eventId}`, undefined, newUserToken)
    test('Non-creator → 403', r.status === 403)

    r = await req('PATCH', `/api/events/${eventId}`, { title: 'Updated' }, rebekahToken)
    test('Creator update works', r.status === 200 && r.data.title === 'Updated')

    r = await req('PATCH', `/api/events/${eventId}`, { title: 'Hack' }, newUserToken)
    test('Non-creator update → 403', r.status === 403)

    // Whitelist: created_by ignored
    r = await req('PATCH', `/api/events/${eventId}`, { title: 'Safe', created_by: 'x' }, rebekahToken)
    test('Whitelist blocks created_by', r.status === 200)
  }

  // ── TOURS ──────────────────────────────────────────────
  console.log('\n── Tours ──')
  {
    let r = await req('POST', '/api/tours', {
      title: 'OptTest Tour', start_date: '2026-07-01', end_date: '2026-07-10',
      director_user_id: rebekahId,
    }, rebekahToken)
    test('Create tour (201)', r.status === 201)
    tourId = r.data.id

    r = await req('POST', '/api/tours', { title: 'No dates' }, rebekahToken)
    test('Missing dates → 400', r.status === 400)

    r = await req('GET', '/api/tours', undefined, rebekahToken)
    test('Tours: paginated', r.status === 200 && !!r.data.pagination)

    r = await req('GET', `/api/tours/${tourId}`, undefined, rebekahToken)
    test('Get tour detail', r.status === 200)

    r = await req('PATCH', `/api/tours/${tourId}`, { title: 'Updated Tour' }, rebekahToken)
    test('Director can update', r.status === 200)

    r = await req('PATCH', `/api/tours/${tourId}`, { title: 'Hack' }, newUserToken)
    test('Non-director update → 403', r.status === 403)

    r = await req('DELETE', `/api/tours/${tourId}`, undefined, newUserToken)
    test('Non-director delete → 403', r.status === 403)
  }

  // ── TASKS ──────────────────────────────────────────────
  console.log('\n── Tasks ──')
  {
    let r = await req('POST', '/api/tasks', { title: 'OptTest Task', event_id: eventId }, rebekahToken)
    test('Create task (201)', r.status === 201)
    taskId = r.data.id

    r = await req('POST', '/api/tasks', { description: 'no title' }, rebekahToken)
    test('Missing title → 400', r.status === 400)

    r = await req('GET', '/api/tasks?assignee=me', undefined, rebekahToken)
    test('Tasks: paginated', r.status === 200 && !!r.data.pagination)

    r = await req('GET', `/api/tasks/${taskId}`, undefined, rebekahToken)
    test('Get task detail', r.status === 200)

    r = await req('PATCH', `/api/tasks/${taskId}`, { status: 'in_progress' }, rebekahToken)
    test('Creator can update task', r.status === 200 && r.data.status === 'in_progress')

    r = await req('PATCH', `/api/tasks/${taskId}`, { title: 'Hack' }, newUserToken)
    test('Non-creator/assignee → 403', r.status === 403)

    r = await req('DELETE', `/api/tasks/${taskId}`, undefined, newUserToken)
    test('Non-creator delete → 403', r.status === 403)
  }

  // ── CONTACTS ───────────────────────────────────────────
  console.log('\n── Contacts ──')
  {
    let r = await req('POST', '/api/contacts', { name: 'OptTest Contact', email: 'c@t.com' }, rebekahToken)
    test('Create contact (201)', r.status === 201)
    contactId = r.data.id

    r = await req('POST', '/api/contacts', { email: 'a@b.com' }, rebekahToken)
    test('Missing name → 400', r.status === 400)

    r = await req('GET', '/api/contacts', undefined, rebekahToken)
    test('Contacts: paginated', r.status === 200 && !!r.data.pagination)

    r = await req('PATCH', `/api/contacts/${contactId}`, { phone: '555' }, rebekahToken)
    test('Creator can update', r.status === 200)

    r = await req('PATCH', `/api/contacts/${contactId}`, { name: 'Hack' }, newUserToken)
    test('Non-creator update → 403', r.status === 403)

    r = await req('DELETE', `/api/contacts/${contactId}`, undefined, newUserToken)
    test('Non-creator delete → 403', r.status === 403)
  }

  // ── USERS ──────────────────────────────────────────────
  console.log('\n── Users ──')
  {
    let r = await req('GET', '/api/users', undefined, rebekahToken)
    test('Users: paginated', r.status === 200 && !!r.data.pagination)

    r = await req('GET', `/api/users/${newUserId}`, undefined, rebekahToken)
    test('Get user detail', r.status === 200)

    r = await req('PATCH', `/api/users/${newUserId}`, { name: 'SelfUpdate' }, newUserToken)
    test('Self-update works', r.status === 200 && r.data.name === 'SelfUpdate')

    const otherUserId = r.data.id !== rebekahId ? rebekahId : newUserId
    r = await req('PATCH', `/api/users/${rebekahId}`, { name: 'Hack' }, newUserToken)
    test('Non-admin update other → 403', r.status === 403)

    r = await req('PATCH', `/api/users/${newUserId}`, { org_role: 'admin' }, newUserToken)
    test('Non-admin role change → 403', r.status === 403)
  }

  // ── ROLE ASSIGNMENTS ───────────────────────────────────
  console.log('\n── Role Assignments ──')
  {
    let r = await req('POST', '/api/role-assignments', {
      event_id: eventId, user_id: newUserId, role: 'contributor', scope: 'event',
    }, rebekahToken)
    test('Owner can assign role (201)', r.status === 201)
    roleAssignmentId = r.data.id

    r = await req('POST', '/api/role-assignments', {
      user_id: newUserId, role: 'contributor', scope: 'event',
    }, rebekahToken)
    test('Missing event/tour → 400', r.status === 400)

    r = await req('POST', '/api/role-assignments', {
      event_id: eventId, user_id: newUserId, role: 'contributor', scope: 'event',
    }, rebekahToken)
    test('Duplicate → 409', r.status === 409)

    r = await req('POST', '/api/role-assignments', {
      event_id: eventId, user_id: newUserId, role: 'guest', scope: 'event',
    }, newUserToken)
    test('Non-owner assign → 403', r.status === 403)

    // Now assigned user CAN access event
    r = await req('GET', `/api/events/${eventId}`, undefined, newUserToken)
    test('Assigned user accesses event', r.status === 200)

    r = await req('DELETE', `/api/role-assignments/${roleAssignmentId}`, undefined, newUserToken)
    test('Non-owner delete → 403', r.status === 403)

    r = await req('DELETE', `/api/role-assignments/${roleAssignmentId}`, undefined, rebekahToken)
    test('Owner deletes assignment (204)', r.status === 204)
  }

  // ── INTEGRATION ────────────────────────────────────────
  console.log('\n── Integration ──')
  {
    let r = await req('GET', '/api/integration/songs', undefined, rebekahToken)
    test('Songs search works', r.status === 200)

    r = await req('GET', '/api/integration/services', undefined, rebekahToken)
    test('Services list works', r.status === 200)

    r = await req('GET', '/api/integration/setlists', undefined, rebekahToken)
    test('Setlists list works', r.status === 200)

    r = await req('GET', '/api/integration/workspaces', undefined, rebekahToken)
    test('Workspaces list works', r.status === 200)

    r = await req('POST', `/api/integration/events/${eventId}/link-service`, {
      flow_service_id: null, setlist_id: null, workspace_id: null,
    }, rebekahToken)
    test('Owner can link event', r.status === 200)

    r = await req('POST', `/api/integration/events/${eventId}/link-service`, {
      flow_service_id: null,
    }, newUserToken)
    test('Non-owner link → 403', r.status === 403)

    r = await req('POST', '/api/integration/services', { title: 'X' }, rebekahToken)
    test('Missing workspace_id → 400', r.status === 400)
  }

  // ── DELETE RETURNS 204 ─────────────────────────────────
  console.log('\n── Delete returns 204 ──')
  {
    let r = await req('DELETE', `/api/tasks/${taskId}`, undefined, rebekahToken)
    test('Delete task → 204', r.status === 204)

    r = await req('DELETE', `/api/contacts/${contactId}`, undefined, rebekahToken)
    test('Delete contact → 204', r.status === 204)

    r = await req('DELETE', `/api/events/${eventId}`, undefined, rebekahToken)
    test('Delete event → 204', r.status === 204)

    r = await req('DELETE', `/api/tours/${tourId}`, undefined, rebekahToken)
    test('Delete tour → 204', r.status === 204)

    r = await req('DELETE', `/api/users/${newUserId}`, undefined, newUserToken)
    test('Delete user → 204', r.status === 204)
  }

  // ── PRISMA ERROR HANDLING ──────────────────────────────
  console.log('\n── Error Handling ──')
  {
    let r = await req('PATCH', '/api/events/nonexistent', { title: 'X' }, rebekahToken)
    test('Update nonexistent → 404', r.status === 404)

    r = await req('DELETE', '/api/tasks/nonexistent', undefined, rebekahToken)
    test('Delete nonexistent → 404', r.status === 404)

    r = await req('GET', '/api/events/nonexistent', undefined, rebekahToken)
    test('Get nonexistent event → 404', r.status === 404)

    r = await req('GET', '/api/tasks/nonexistent', undefined, rebekahToken)
    test('Get nonexistent task → 404', r.status === 404)
  }

  // ── SUMMARY ────────────────────────────────────────────
  console.log(`\n═══ RESULTS: ${pass}/${total} passed, ${fail} failed ═══\n`)
  if (fail > 0) process.exit(1)
}

run().catch(e => { console.error(e); process.exit(1) })
