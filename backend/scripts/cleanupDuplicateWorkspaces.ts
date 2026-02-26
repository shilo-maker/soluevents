/**
 * One-time cleanup script: remove duplicate personal workspaces.
 *
 * Problem: SoluFlow creates personal workspaces without setting `createdById`.
 * When those users log into SoluPlan, `ensurePersonalWorkspace` didn't find the
 * existing workspace (it queried by createdById) and created a second one.
 *
 * This script:
 * 1. Finds users who are members of 2+ personal workspaces
 * 2. Keeps the OLDER workspace (the SoluFlow-created original)
 * 3. Migrates events from the duplicate to the kept workspace
 * 4. Updates user.activeWorkspaceId / defaultWorkspaceId if they point to the duplicate
 * 5. Deletes duplicate workspace members, invitations, then the workspace itself
 *
 * Run: npx tsx scripts/cleanupDuplicateWorkspaces.ts
 * Add --dry-run to preview changes without modifying the database.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN — no changes will be made ===\n')
  }

  // Find all users who are members of more than one personal workspace
  const usersWithMultiple = await prisma.$queryRaw<
    { userId: string; count: bigint }[]
  >`
    SELECT wm."userId", COUNT(DISTINCT w.id) as count
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm."workspaceId"
    WHERE w."workspaceType" = 'personal'
    GROUP BY wm."userId"
    HAVING COUNT(DISTINCT w.id) > 1
  `

  if (usersWithMultiple.length === 0) {
    console.log('No users with duplicate personal workspaces found. Nothing to clean up.')
    return
  }

  console.log(`Found ${usersWithMultiple.length} user(s) with duplicate personal workspaces:\n`)

  for (const row of usersWithMultiple) {
    const user = await prisma.user.findUnique({
      where: { id: row.userId },
      select: { id: true, name: true, email: true, activeWorkspaceId: true, defaultWorkspaceId: true },
    })
    if (!user) continue

    console.log(`--- User: ${user.name || user.email} (${user.id}) ---`)

    // Get all personal workspaces this user is a member of, ordered by creation date
    const personalWorkspaces = await prisma.workspace.findMany({
      where: {
        workspaceType: 'personal',
        members: { some: { userId: user.id } },
      },
      include: {
        members: { select: { userId: true, role: true } },
        _count: { select: { songs: true, flowServices: true, invitations: true, songWorkspaces: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Keep the oldest (first-created) workspace — that's the SoluFlow original
    const keep = personalWorkspaces[0]
    const duplicates = personalWorkspaces.slice(1)

    console.log(`  KEEP: "${keep.name}" (${keep.id}) — created ${keep.createdAt.toISOString()}, ${keep.members.length} member(s)`)

    for (const dup of duplicates) {
      console.log(`  DELETE: "${dup.name}" (${dup.id}) — created ${dup.createdAt.toISOString()}, ${dup.members.length} member(s)`)

      // Check for events linked to the duplicate workspace
      const linkedEvents = await prisma.event.findMany({
        where: { workspace_id: dup.id },
        select: { id: true, title: true },
      })

      if (linkedEvents.length > 0) {
        console.log(`    Migrating ${linkedEvents.length} event(s) to kept workspace:`)
        for (const evt of linkedEvents) {
          console.log(`      - "${evt.title}" (${evt.id})`)
        }
        if (!DRY_RUN) {
          await prisma.event.updateMany({
            where: { workspace_id: dup.id },
            data: { workspace_id: keep.id },
          })
        }
      }

      // Migrate SoluFlow data (songs, services, song-workspace links) to the kept workspace
      if (dup._count.flowServices > 0) {
        console.log(`    Migrating ${dup._count.flowServices} SoluFlow service(s) to kept workspace`)
        if (!DRY_RUN) {
          await prisma.flowService.updateMany({
            where: { workspaceId: dup.id },
            data: { workspaceId: keep.id },
          })
        }
      }
      if (dup._count.songs > 0) {
        console.log(`    Migrating ${dup._count.songs} song(s) to kept workspace`)
        if (!DRY_RUN) {
          await prisma.song.updateMany({
            where: { workspaceId: dup.id },
            data: { workspaceId: keep.id },
          })
        }
      }
      if (dup._count.songWorkspaces > 0) {
        console.log(`    Migrating ${dup._count.songWorkspaces} song-workspace link(s) to kept workspace`)
        if (!DRY_RUN) {
          // Update where possible, delete if conflict (song already linked to kept workspace)
          const songLinks = await prisma.songWorkspace.findMany({
            where: { workspaceId: dup.id },
            select: { id: true, songId: true },
          })
          for (const link of songLinks) {
            const existsInKept = await prisma.songWorkspace.findFirst({
              where: { songId: link.songId, workspaceId: keep.id },
            })
            if (existsInKept) {
              await prisma.songWorkspace.delete({ where: { id: link.id } })
            } else {
              await prisma.songWorkspace.update({
                where: { id: link.id },
                data: { workspaceId: keep.id },
              })
            }
          }
        }
      }

      // Fix user references pointing to the duplicate
      const usersPointingHere = await prisma.user.findMany({
        where: {
          OR: [
            { activeWorkspaceId: dup.id },
            { defaultWorkspaceId: dup.id },
          ],
        },
        select: { id: true, activeWorkspaceId: true, defaultWorkspaceId: true },
      })

      for (const u of usersPointingHere) {
        console.log(`    Redirecting user ${u.id} workspace references to kept workspace`)
        if (!DRY_RUN) {
          await prisma.user.update({
            where: { id: u.id },
            data: {
              ...(u.activeWorkspaceId === dup.id ? { activeWorkspaceId: keep.id } : {}),
              ...(u.defaultWorkspaceId === dup.id ? { defaultWorkspaceId: keep.id } : {}),
            },
          })
        }
      }

      // Delete invitations for the duplicate workspace
      const invitationCount = dup._count.invitations
      if (invitationCount > 0) {
        console.log(`    Deleting ${invitationCount} invitation(s)`)
        if (!DRY_RUN) {
          await prisma.workspaceInvitation.deleteMany({
            where: { workspaceId: dup.id },
          })
        }
      }

      // Delete workspace members
      console.log(`    Deleting ${dup.members.length} membership(s)`)
      if (!DRY_RUN) {
        await prisma.workspaceMember.deleteMany({
          where: { workspaceId: dup.id },
        })
      }

      // Delete the duplicate workspace
      console.log(`    Deleting workspace "${dup.name}"`)
      if (!DRY_RUN) {
        await prisma.workspace.delete({
          where: { id: dup.id },
        })
      }
    }

    console.log()
  }

  console.log(DRY_RUN ? 'Dry run complete. Re-run without --dry-run to apply changes.' : 'Cleanup complete.')
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
