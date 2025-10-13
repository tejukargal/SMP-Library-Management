# Restore Backup Guide

## Do I need to empty the database before restoring?

**NO** - You do NOT need to empty the database before restoring a backup. The restore function uses "upsert" which:
- **Adds** new records that don't exist
- **Updates** existing records if they already exist (based on primary keys)
- **Keeps** all existing data intact

## How to Restore a Backup

1. Click the hamburger menu (☰) in the header
2. Select "Import Data"
3. Enter password: `teju2015`
4. Select your backup JSON file
5. Confirm the restore operation

## Troubleshooting

If the restore fails, please check the browser console for detailed error messages:

1. Press **F12** to open Developer Tools
2. Click on the **Console** tab
3. Try the restore again
4. Look for error messages that say:
   - "Student restore error details"
   - "Book issues restore error details"
5. Share these error messages for help

## What the Console Shows

The console will display:
- Progress messages like "Restoring students..."
- Batch completion messages
- Detailed error information if something fails:
  - Error message
  - Error code
  - Hints about what went wrong

## Common Issues

1. **Invalid JSON file**: Make sure you're selecting a valid backup JSON file exported from this app
2. **Network issues**: Check your internet connection
3. **Database permissions**: Ensure your Supabase credentials are correct in config.json

## After Successful Restore

After a successful restore:
- Dashboard will automatically refresh
- You'll see a success message with count of restored records
- All students and book records from the backup will be available
