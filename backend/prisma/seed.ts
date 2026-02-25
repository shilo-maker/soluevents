import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding SoluPlan data into shared database...')

  // Use existing SoluCast users — update their SoluPlan-specific columns
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true },
    orderBy: { createdAt: 'asc' },
    take: 7,
  })

  if (users.length < 3) {
    console.error('Need at least 3 existing users to seed SoluPlan data')
    process.exit(1)
  }

  // Assign SoluPlan roles to the first few users
  const [user1, user2, user3, user4, user5, user6, user7] = users

  await prisma.user.update({
    where: { id: user1.id },
    data: { name: user1.username || user1.email.split('@')[0], org_role: 'admin' },
  })
  await prisma.user.update({
    where: { id: user2.id },
    data: { name: user2.username || user2.email.split('@')[0], org_role: 'manager' },
  })
  await prisma.user.update({
    where: { id: user3.id },
    data: { name: user3.username || user3.email.split('@')[0], org_role: 'manager' },
  })
  for (const u of [user4, user5, user6, user7].filter(Boolean)) {
    await prisma.user.update({
      where: { id: u.id },
      data: { name: u.username || u.email.split('@')[0], org_role: 'member' },
    })
  }

  console.log(`✓ Updated ${Math.min(users.length, 7)} users with SoluPlan roles`)

  // Create templates
  await prisma.template.create({
    data: {
      kind: 'event',
      label: 'Worship Night',
      default_fields: {
        type: 'worship',
        phase: 'concept',
        status: 'planned',
        est_attendance: 200,
      },
      default_tasks: [
        { title: 'Prepare flyer/social media', priority: 'high', due_days_before: 14 },
        { title: 'Send technical rider to sound engineer', priority: 'high', due_days_before: 7 },
        { title: 'Open registration', priority: 'normal', due_days_before: 10 },
        { title: 'Send set list to team', priority: 'high', due_days_before: 3 },
        { title: 'Send projection pack', priority: 'normal', due_days_before: 2 },
        { title: 'Confirm hospitality plan', priority: 'normal', due_days_before: 5 },
      ],
      default_agenda: [
        { label: 'Doors Open', duration: 30, offset_minutes: 0 },
        { label: 'Welcome & Prayer', duration: 10, offset_minutes: 30 },
        { label: 'Worship Set 1', duration: 25, offset_minutes: 40 },
        { label: 'Message', duration: 30, offset_minutes: 65 },
        { label: 'Worship Set 2', duration: 20, offset_minutes: 95 },
        { label: 'Closing Prayer', duration: 5, offset_minutes: 115 },
      ],
      default_rider: {
        title: 'Worship Night Technical Rider',
        sections: [
          { heading: 'Audio', items: ['House PA', '8+ channels', 'DI boxes', 'Wireless mics', 'Monitor mix'] },
          { heading: 'Video', items: ['Projector & screen', 'HDMI connection', 'Confidence monitor'] },
          { heading: 'Stage', items: ['16x12 ft minimum', 'Stage lighting', 'Power outlets'] },
        ],
      },
    },
  })

  await prisma.template.create({
    data: {
      kind: 'tour',
      label: 'Multi-Day Tour',
      default_fields: { regions: [] },
      default_tasks: [
        { title: 'Confirm all venue contacts', priority: 'critical', due_days_before: 21 },
        { title: 'Book lodging for all nights', priority: 'critical', due_days_before: 21 },
        { title: 'Send riders to all venues', priority: 'high', due_days_before: 14 },
        { title: 'Create tour devotional schedule', priority: 'normal', due_days_before: 10 },
        { title: 'Prepare tour media kit', priority: 'high', due_days_before: 14 },
      ],
      default_agenda: [],
      default_rider: { title: 'Tour Technical Rider', note: 'Standard rider for all tour stops' },
    },
  })

  console.log('✓ Created event templates')

  // Create a sample event
  const sampleEvent = await prisma.event.create({
    data: {
      type: 'worship',
      title: 'Summer Worship Night 2026',
      description: 'An evening of worship and prayer in Israel',
      date_start: new Date('2026-06-15T19:00:00Z'),
      date_end: new Date('2026-06-15T21:30:00Z'),
      timezone: 'Asia/Jerusalem',
      location_name: 'Community Hall',
      address: 'Tel Aviv, Israel',
      est_attendance: 200,
      phase: 'prep',
      status: 'confirmed',
      tags: ['worship', 'summer'],
      created_by: user1.id,
    },
  })

  console.log('✓ Created sample event')

  // Create role assignments
  const roleData = [
    { event_id: sampleEvent.id, user_id: user2.id, role: 'event_manager' as const, scope: 'event' as const },
    { event_id: sampleEvent.id, user_id: user3.id, role: 'worship_lead' as const, scope: 'event' as const },
  ]
  if (user4) roleData.push({ event_id: sampleEvent.id, user_id: user4.id, role: 'media_lead' as const, scope: 'event' as const })
  if (user5) roleData.push({ event_id: sampleEvent.id, user_id: user5.id, role: 'hospitality' as const, scope: 'event' as const })

  await prisma.roleAssignment.createMany({ data: roleData })
  console.log('✓ Created role assignments')

  // Create sample tasks
  const taskData = [
    {
      title: 'Prepare social media posts',
      description: 'Create and schedule Instagram/Facebook posts for the event',
      priority: 'high' as const,
      status: 'in_progress' as const,
      due_at: new Date('2026-06-01T12:00:00Z'),
      event_id: sampleEvent.id,
      assignee_id: user4?.id || user3.id,
      creator_id: user1.id,
    },
    {
      title: 'Send technical rider to venue',
      description: 'Email the audio/video requirements to the sound engineer',
      priority: 'high' as const,
      status: 'not_started' as const,
      due_at: new Date('2026-06-08T12:00:00Z'),
      event_id: sampleEvent.id,
      assignee_id: user2.id,
      creator_id: user1.id,
    },
    {
      title: 'Finalize worship set list',
      description: 'Choose songs and send to team for practice',
      priority: 'critical' as const,
      status: 'not_started' as const,
      due_at: new Date('2026-06-12T12:00:00Z'),
      event_id: sampleEvent.id,
      assignee_id: user3.id,
      creator_id: user3.id,
    },
  ]

  await prisma.task.createMany({ data: taskData })
  console.log('✓ Created sample tasks')

  console.log('\n✅ SoluPlan data seeded into shared database!')
  console.log(`\nUpdated users for SoluPlan access:`)
  for (const u of users.slice(0, 7)) {
    console.log(`  - ${u.email} (${u.username})`)
  }
  console.log('\nAll SoluCast users can log into SoluPlan with their existing credentials.')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
