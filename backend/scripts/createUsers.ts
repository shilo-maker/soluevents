import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createUsers() {
  const users = [
    {
      name: 'Shilo Ben Hod',
      email: 'shilo@soluisrael.org',
      password: '1397152535Bh@',
      org_role: 'admin' as const,
    },
    {
      name: 'Levi Davis',
      email: 'levi@soluisrael.org',
      password: '1397152535Bh@',
      org_role: 'member' as const,
    },
    {
      name: 'Sarah Ben Hod',
      email: 'sarah@soluisrael.org',
      password: '1397152535Bh@',
      org_role: 'member' as const,
    },
  ]

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      })

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`)
        continue
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          org_role: userData.org_role,
          is_active: true,
        },
      })

      console.log(`✓ Created user: ${user.name} (${user.email}) - ${user.org_role}`)
    } catch (error) {
      console.error(`✗ Failed to create user ${userData.email}:`, error)
    }
  }

  await prisma.$disconnect()
}

createUsers()
  .then(() => {
    console.log('\n✓ User creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
