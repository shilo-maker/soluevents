# SoluEvents Integration - Service Account

## Quick Reference

**Production Account Details:**
- Email: `EventsApp@soluisrael.org`
- Password: `1397152535Bh@`
- User ID: `21`
- Workspace ID: `3` (SoluTeam)
- Workspace Name: `SoluTeam`
- Workspace Slug: `soluteam-1761197846079`
- Workspace Type: `organization`
- User Role: `admin`
- Workspace Member Role: `admin`
- Verified: `true`
- Active: `true`

**Local Development Account:**
- User ID: `25`
- Workspace ID: `32`
- (Same credentials as production)

## Purpose

This dedicated service account is used by the SoluEvents application to:
- Create services and setlists in SoluFlow programmatically
- All content is created in the **SoluTeam** workspace (shared team workspace)
- Eliminate the need for individual user authentication
- Integrate seamlessly with the existing SoluTeam workflow

## Authentication Example

```javascript
const response = await fetch('http://localhost:5002/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'EventsApp@soluisrael.org',
    password: '1397152535Bh@'
  })
});

const { token } = await response.json();
```

## Production URLs

**Development:**
- Auth: `http://localhost:5002/api/auth/login`
- Services: `http://localhost:5002/api/services`
- Setlists: `http://localhost:5002/api/setlists`

**Production:**
- Auth: `https://soluflow.app/api/auth/login`
- Services: `https://soluflow.app/api/services`
- Setlists: `https://soluflow.app/api/setlists`

## Security Notes

- This account is for server-to-server communication only
- Keep credentials secure in environment variables
- Token expires per JWT settings (default: 30 days)
- All content created through this account will be in the **SoluTeam** workspace (ID: 3)

## Created

- Date: 2025-11-03
- Purpose: SoluFlow ↔ SoluEvents Integration
- Workspace: SoluTeam (existing team workspace)

## Updates

- **2025-11-03**: Moved to SoluTeam workspace per user request
  - Changed from workspace ID 25 to workspace ID 3 (SoluTeam)
  - Upgraded to admin role in SoluTeam workspace
  - Old unused workspace (ID 25) deleted
