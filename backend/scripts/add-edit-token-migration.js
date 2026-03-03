/**
 * Migration: Add editToken column to flow_services table (shared production DB)
 * Run from soluevents root: npx tsx backend/scripts/add-edit-token-migration.js
 *
 * Uses Prisma from the soluevents backend (connects to shared production DB via DATABASE_URL).
 * Safe to re-run — skips if column already exists.
 */

const crypto = require('crypto');

async function migrate() {
  // Dynamic import for the Prisma client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  console.log('=== Add editToken to flow_services ===\n');

  try {
    // Check if column already exists
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'flow_services' AND column_name = 'editToken'
    `);

    if (cols.length > 0) {
      console.log('Column "editToken" already exists — skipping ALTER TABLE.\n');
    } else {
      console.log('1. Adding "editToken" column to flow_services...');
      await prisma.$executeRawUnsafe('ALTER TABLE flow_services ADD COLUMN "editToken" VARCHAR(64)');
      console.log('   Done.\n');
    }

    // Backfill existing services that have no editToken
    console.log('2. Backfilling existing services with random tokens...');
    const services = await prisma.$queryRawUnsafe(
      'SELECT id FROM flow_services WHERE "editToken" IS NULL'
    );
    console.log(`   Found ${services.length} services to backfill.`);

    for (const service of services) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.$executeRawUnsafe(
        'UPDATE flow_services SET "editToken" = $1 WHERE id = $2::uuid',
        token,
        service.id
      );
    }
    console.log('   Done.\n');

    // Add unique index (if not exists)
    console.log('3. Adding unique index on "editToken"...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS flow_services_edit_token_unique ON flow_services("editToken")
    `);
    console.log('   Done.\n');

    console.log('=== Migration complete ===');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
