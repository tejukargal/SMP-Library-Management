-- SMP Library Management System - Nile Database Schema
-- Database: smp_library (Nile, AWS_US_WEST_2)
-- Note: Nile doesn't support custom functions/triggers — updated_at is managed in app code

-- Students table
-- Composite primary key because EE (Unaided) and other courses may share reg numbers
CREATE TABLE IF NOT EXISTS students (
    reg_no TEXT NOT NULL,
    name TEXT NOT NULL,
    father TEXT NOT NULL,
    year TEXT NOT NULL,
    course TEXT NOT NULL,
    in_out TEXT DEFAULT 'In',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (reg_no, course)
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    staff_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT,
    designation TEXT,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Book issues table
CREATE TABLE IF NOT EXISTS book_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_reg_no TEXT,
    student_course TEXT,
    staff_id TEXT,
    borrower_type TEXT,           -- 'student' or 'staff'
    book_name TEXT NOT NULL,
    author TEXT NOT NULL,
    book_no TEXT NOT NULL,
    sem TEXT,
    phone_no TEXT,
    issue_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL CHECK (status IN ('issued', 'returned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    FOREIGN KEY (student_reg_no, student_course) REFERENCES students(reg_no, course) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_book_issues_student_reg_no ON book_issues(student_reg_no);
CREATE INDEX IF NOT EXISTS idx_book_issues_status ON book_issues(status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
