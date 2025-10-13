-- Migration: Add sem and phone_no fields to book_issues table
-- Date: 2025-10-13

-- Add sem (semester) field
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS sem TEXT;

-- Add phone_no field
ALTER TABLE book_issues ADD COLUMN IF NOT EXISTS phone_no TEXT;

-- Add comment for documentation
COMMENT ON COLUMN book_issues.sem IS 'Student semester at time of book issue (e.g., 1st Sem, 2nd Sem, etc.)';
COMMENT ON COLUMN book_issues.phone_no IS 'Student phone number at time of book issue';
