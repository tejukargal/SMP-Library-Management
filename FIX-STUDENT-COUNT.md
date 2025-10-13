# Fix Student Count Issue

## Expected Counts (from CSV)
- **CE**: 110
- **ME**: 151
- **EC**: 183
- **CS**: 189
- **EE**: 154
- **Total**: 787

## Changes Made

### 1. Updated Counting Logic
Now counts each (reg_no, course) combination as a unique student enrollment:
- A student with reg_no "001" in CS is counted once for CS
- If the same reg_no "001" exists in EE, it's counted once for EE
- Total = sum of all course enrollments

### 2. Fixed Status Filtering
Updated query to include students with `in_out = 'In'` OR `in_out = NULL`:
```javascript
.or('in_out.eq.In,in_out.is.null')
```

## Steps to Fix

### Option 1: Update Existing Records (Quickest)

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to SQL Editor**
3. **Run this SQL** (from `fix-student-status.sql`):

```sql
-- Update all null in_out values to 'In'
UPDATE students
SET in_out = 'In'
WHERE in_out IS NULL;

-- Verify counts by course
SELECT
    course,
    COUNT(*) as count
FROM students
WHERE in_out = 'In' OR in_out IS NULL
GROUP BY course
ORDER BY course;
```

4. **Check the output** - it should show:
   - CE: 110
   - CS: 189
   - EC: 183
   - EE: 154
   - ME: 151

5. **Refresh your dashboard** (Ctrl + Shift + R)

### Option 2: Re-import CSV Data (Most Reliable)

If your CSV has the 'In/Out' column populated:

1. **Run the import command**:
   ```bash
   npm run import
   ```

2. **Wait for completion** - the script will show:
   - Number of students imported
   - Any errors or duplicates removed

3. **Refresh your dashboard** (Ctrl + Shift + R)

## Verify the Fix

### 1. Check Browser Console
Open Developer Tools (F12) and check the Console tab for:
```
Total students counted: 787
Course-wise student counts: {CE: 110, ME: 151, EC: 183, CS: 189, EE: 154}
```

### 2. Check Dashboard
- **Total Students** metric card should show: **787**
- Click on the card to see course breakdown
- Each course should match the expected counts

### 3. Verify in Database
Run this SQL in Supabase:
```sql
-- Count students by course with proper filtering
SELECT
    course,
    COUNT(DISTINCT (reg_no || '_' || course)) as unique_enrollments
FROM students
WHERE in_out = 'In' OR in_out IS NULL
GROUP BY course
ORDER BY course;

-- Check total
SELECT
    COUNT(DISTINCT (reg_no || '_' || course)) as total_enrollments
FROM students
WHERE in_out = 'In' OR in_out IS NULL;
```

## Troubleshooting

### Issue: Count is still 0
**Cause**: The `in_out` column doesn't exist
**Solution**: Run the migration SQL from `migration-add-in-out.sql`

### Issue: Count is less than 787
**Cause**: Some students have `in_out = 'Out'` or `in_out IS NULL` wasn't included
**Solution**:
- Run the fix SQL to update null values to 'In'
- Or re-import CSV with proper 'In/Out' column

### Issue: Count is more than 787
**Cause**: Duplicate records in database
**Solution**:
- Check for duplicates:
  ```sql
  SELECT reg_no, course, COUNT(*)
  FROM students
  GROUP BY reg_no, course
  HAVING COUNT(*) > 1;
  ```
- Re-import CSV with `upsert` to remove duplicates

### Issue: Course counts don't match
**Cause**: CSV data doesn't match database data
**Solution**:
1. Check your CSV file for actual counts per course
2. Re-import the CSV data
3. Verify with SQL query

## Understanding the New Logic

### Previous Logic (INCORRECT)
- Non-EE courses: Deduplicated across courses by reg_no
- EE: Counted separately by reg_no + course
- This caused undercounting

### New Logic (CORRECT)
- All courses: Each (reg_no, course) combination counted once
- A student in multiple courses appears in each course count
- Total = CE + ME + EC + CS + EE = 787

### Example
```
CSV Data:
Reg_No  Course  In/Out
001     CS      In
001     EE      In     ← Same reg_no, different course
002     ME      In

Count:
- CS: 1 (reg_no 001)
- EE: 1 (reg_no 001)
- ME: 1 (reg_no 002)
- Total: 3 ✅
```

## Quick Check Commands

### In Supabase SQL Editor:
```sql
-- Quick count check
SELECT course, COUNT(*) as count
FROM students
WHERE in_out = 'In' OR in_out IS NULL
GROUP BY course
ORDER BY course;

-- Should show:
-- CE: 110, CS: 189, EC: 183, EE: 154, ME: 151
```

### In Browser Console (F12):
```javascript
// Check loaded data
console.log('Total students:', document.getElementById('totalStudents').textContent);
// Should show: 787
```

## Need Help?

If the counts still don't match after following these steps:
1. Check the browser console for error messages
2. Verify the SQL query results match expected counts
3. Check if your CSV has the expected 787 rows with 'In' status
4. Ensure you've refreshed the page after making database changes
