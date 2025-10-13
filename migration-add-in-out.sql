-- Migration: Add in_out column to students table
-- Run this in your Supabase SQL Editor

-- Add in_out column if it doesn't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS in_out TEXT DEFAULT 'In';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'in_out';

-- Show current students count (should show the new column)
SELECT COUNT(*) as total_students,
       COUNT(CASE WHEN in_out = 'In' THEN 1 END) as in_status,
       COUNT(CASE WHEN in_out = 'Out' THEN 1 END) as out_status
FROM students;
