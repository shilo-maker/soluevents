# Installing PostgreSQL for Solu Events

The app requires PostgreSQL to run. Here's how to install and set it up:

## Option 1: Install PostgreSQL (Recommended)

### Windows:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer (select all components)
3. During installation, set a password for the postgres user (remember this!)
4. Keep default port (5432)
5. Complete the installation

### After Installation:
1. Open "SQL Shell (psql)" from Start Menu
2. Press Enter for all prompts (uses defaults)
3. Enter your postgres password
4. Create the database:
   ```sql
   CREATE DATABASE solu_events;
   \q
   ```

### Update .env file:
If you used a different password than "postgres", update `backend/.env`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/solu_events?schema=public"
```

## Option 2: Use Docker (Alternative)

If you have Docker installed:

```bash
docker run --name solu-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=solu_events -p 5432:5432 -d postgres:15
```

This creates a PostgreSQL container with the database already set up.

## Option 3: Use a Cloud Database (Quickest)

Use a free PostgreSQL database from one of these providers:
- **Neon** (https://neon.tech) - Free tier, instant setup
- **Supabase** (https://supabase.com) - Free tier with 500MB
- **Railway** (https://railway.app) - Free trial

After creating a database, copy the connection string and update `backend/.env`:
```
DATABASE_URL="postgresql://user:password@host:port/database"
```

## Continue Setup

Once PostgreSQL is running:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
cd ..
npm run dev
```

## Verify PostgreSQL is Running

To check if PostgreSQL is running:

**Windows:**
- Open Services (services.msc)
- Look for "postgresql-x64-XX" service
- Ensure it's Running

**Command line:**
```bash
psql -U postgres -c "SELECT version();"
```

## Troubleshooting

### "Can't reach database server"
- Make sure PostgreSQL service is running
- Check that port 5432 isn't blocked by firewall
- Verify the password in DATABASE_URL matches your postgres password

### "Database does not exist"
- Run: `psql -U postgres -c "CREATE DATABASE solu_events;"`

### Still having issues?
The easiest option is to use **Neon** (cloud PostgreSQL):
1. Go to https://neon.tech
2. Sign up (free)
3. Create a project
4. Copy the connection string
5. Paste it into `backend/.env` as DATABASE_URL
6. Continue with setup

That's it! The cloud option takes less than 2 minutes and requires no local installation.
