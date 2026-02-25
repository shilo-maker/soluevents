import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const users = await p.$queryRawUnsafe<any[]>(
    `SELECT email, username, password IS NOT NULL as has_password FROM users ORDER BY "createdAt" LIMIT 15`
  )
  users.forEach(u => console.log(u.email, '|', u.username, '| has_pw:', u.has_password))
}

main().finally(() => p.$disconnect())
