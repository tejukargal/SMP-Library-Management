-- Fix Student Status: Update existing students to have 'In' status if null
-- Run this in your Supabase SQL Editor

-- Step 1: Check how many students have null in_out status
SELECT
    COUNT(*) as total_students,
    COUNT(CASE WHEN in_out IS NULL THEN 1 END) as null_status,
    COUNT(CASE WHEN in_out = 'In' THEN 1 END) as in_status,
    COUNT(CASE WHEN in_out = 'Out' THEN 1 END) as out_status
FROM students;

-- Step 2: Update all null in_out values to 'In'
UPDATE students
SET in_out = 'In'
WHERE in_out IS NULL;

-- Step 3: Verify the update
SELECT
    COUNT(*) as total_students,
    COUNT(CASE WHEN in_out IS NULL THEN 1 END) as null_status,
    COUNT(CASE WHEN in_out = 'In' THEN 1 END) as in_status,
    COUNT(CASE WHEN in_out = 'Out' THEN 1 END) as out_status
FROM students;

-- Step 4: Show count by course
SELECT
    course,
    COUNT(*) as total,
    COUNT(CASE WHEN in_out = 'In' THEN 1 END) as in_status,
    COUNT(CASE WHEN in_out = 'Out' THEN 1 END) as out_status
FROM students
GROUP BY course
ORDER BY course;

-- Expected results (from your CSV):
-- CE: 110
-- ME: 151
-- EC: 183
-- CS: 189
-- EE: 154
-- Total: 787
