# Database Update Instructions

## Steps to Fix the Students Count

### Step 1: Update Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add in_out column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS in_out TEXT DEFAULT 'In';
```

6. Click **Run** or press `Ctrl+Enter`
7. Verify success message appears

### Step 2: Re-import Student Data

Now you need to re-import your students CSV to populate the new `in_out` column:

1. Make sure your `students.csv` file has an **In/Out** column with values 'In' or 'Out'
2. Open a terminal/command prompt in this folder
3. Run the import command:

```bash
npm run import
```

4. Wait for the import to complete
5. Check the console output for success/error messages

### Step 3: Test the Dashboard

1. Start your local server:
   ```bash
   npm run serve
   ```

2. Open http://localhost:8000 in your browser

3. Login to the application

4. Verify the **Total Students** metric card shows the correct count

5. Click on the **Total Students** card to see the course-wise breakdown

6. Confirm that:
   - Only students with 'In' status are counted
   - All courses (including EE) are counted by reg_no
   - The breakdown matches your expectations

### What Changed

✅ **Database Schema**: Added `in_out` column to track student admission status

✅ **Import Script**: Now imports the 'In/Out' column from your CSV file

✅ **Dashboard Logic**:
- Only counts students with 'In' status (excludes 'Out' students)
- All courses counted uniformly by reg_no (no EE special logic)
- Shows "Total Students (In Status)" in the breakdown modal

### Troubleshooting

**Issue**: Column already exists error
- **Solution**: The column was already added. Skip Step 1 and proceed to Step 2.

**Issue**: Import fails with "column does not exist"
- **Solution**: Make sure you completed Step 1 first.

**Issue**: Student count is 0
- **Solution**: Check that your CSV has an 'In/Out' column with 'In' values, or verify the default 'In' value was set correctly.

**Issue**: Students with 'Out' status still showing
- **Solution**: Clear your browser cache and reload the page (Ctrl+Shift+R).

### CSV Format

Your `students.csv` should have these columns:

```csv
Reg No,Student Name,Father Name,Year,Course,In/Out
001,JOHN DOE,FATHER NAME,2023,CS,In
002,JANE SMITH,FATHER NAME,2023,EE,Out
```

The **In/Out** column should contain:
- `In` - for currently admitted students (will be counted)
- `Out` - for students who have left (will NOT be counted)
