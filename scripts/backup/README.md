# Brolay Backup & Restore Scripts

**CRITICAL**: These scripts are your safety net for the Track 2 data restructure migration.

## Important: Collection Name

The Firestore collection is named **`parlays`** (not `brolays`). The app calls them "brolays" but the database collection is `parlays`. The scripts are configured to use the correct collection name.

## Overview

These scripts allow you to:
1. **Export** all parlays/brolays from Firestore to a JSON file on your local machine
2. **Restore** parlays from that backup if anything goes wrong

## Quick Start

### Create a Backup

```bash
# From the project root directory
node scripts/backup/export-firestore.js
```

This will:
- Connect to the production Firestore database
- Download all brolays
- Save to `backups/brolay-backup-YYYY-MM-DD-HHmmss.json`
- Also create `backups/brolay-backup-latest.json` as a copy

### Restore from Backup (EMERGENCY USE)

```bash
# Restore from latest backup
node scripts/backup/restore-firestore.js

# Restore from specific backup
node scripts/backup/restore-firestore.js backups/brolay-backup-2026-01-25-143022.json
```

**WARNING**: Restore will OVERWRITE existing documents!

## Backup File Structure

Each backup file contains:

```json
{
  "metadata": {
    "exportedAt": "2026-01-25T14:30:22.000Z",
    "projectId": "brolay-toxic-standings",
    "collection": "brolays",
    "documentCount": 350,
    "pickCount": 1500
  },
  "statistics": {
    "totalBrolays": 350,
    "totalPicks": 1500,
    "bigGuys": ["Management", "CD", "914", "Junior", "Jacoby"],
    "sports": ["NFL", "NBA", ...],
    "settledCount": 320,
    "pendingCount": 30,
    ...
  },
  "data": [
    { "id": "abc123", "date": "2025-01-22", ... },
    ...
  ]
}
```

## When to Use Restore

Use the restore script if:

1. **Migration Fails**: Track 2 migration corrupts or loses data
2. **Data Corruption**: Any unexpected data issues
3. **Accidental Deletion**: Documents accidentally deleted
4. **Rollback Needed**: Need to revert to pre-migration state

## Backup Best Practices

1. **Always backup before migration**
   ```bash
   node scripts/backup/export-firestore.js
   ```

2. **Verify the backup**
   - Check the console output for totals
   - Open the JSON file and spot-check a few brolays
   - Ensure all Big Guys are represented

3. **Keep multiple backups**
   - Each export creates a timestamped file
   - Don't delete old backups until migration is stable (30+ days)

4. **Test restore on test instance first**
   - Before relying on restore, test it on a non-production Firebase
   - Verify restored data matches original

## File Locations

- **Backup files**: `backups/brolay-backup-*.json`
- **Latest backup**: `backups/brolay-backup-latest.json`
- **Export script**: `scripts/backup/export-firestore.js`
- **Restore script**: `scripts/backup/restore-firestore.js`

## Troubleshooting

### "Cannot find module 'firebase/app'"

Make sure you're running from the project root and dependencies are installed:
```bash
npm install
```

### "Backup file not found"

Check that the backup file exists:
```bash
ls backups/
```

### "Permission denied" on Firestore

The scripts use the web API which may have security rules. If you get permission errors:
1. Check Firebase console for security rules
2. Ensure the app is configured correctly
3. Try running at a time when security rules allow reads/writes

### Restore is slow

Restore uses batched writes (400 documents per batch). For ~350 brolays, it should complete in under a minute. If it's taking longer, check your network connection.

## Technical Details

### Export Process
1. Initialize Firebase with web SDK
2. Query all documents from 'brolays' collection
3. Sort by date (newest first)
4. Analyze and generate statistics
5. Write to timestamped JSON file

### Restore Process
1. Parse backup JSON file
2. Validate structure
3. Ask for confirmation
4. Batch write documents (400 per batch)
5. Fall back to individual writes if batch fails
6. Report results

### Rate Limits
- Firestore batch writes: max 500 operations
- Script uses 400 per batch for safety margin
- No read limits for export (all documents fetched at once)

## Important Notes

- **Backup files are NOT encrypted** - they contain all your brolay data in plain JSON
- **Keep backups secure** - don't commit to public repositories
- **Test the restore script BEFORE you need it** - verify it works on a test instance

---

Last Updated: January 25, 2026
For Track 2: Data Structure Restructure Migration
