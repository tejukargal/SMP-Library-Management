-- Library Management System Database Schema

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    reg_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    father TEXT NOT NULL,
    year TEXT NOT NULL,
    course TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create book_issues table
CREATE TABLE IF NOT EXISTS book_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_reg_no TEXT NOT NULL REFERENCES students(reg_no) ON DELETE CASCADE,
    book_name TEXT NOT NULL,
    author TEXT NOT NULL,
    book_no TEXT NOT NULL,
    issue_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL CHECK (status IN ('issued', 'returned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_issues_student_reg_no ON book_issues(student_reg_no);
CREATE INDEX IF NOT EXISTS idx_book_issues_status ON book_issues(status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_issues ENABLE ROW LEVEL SECURITY;

-- Create policies for students table (allow all operations for authenticated users)
CREATE POLICY "Allow all operations on students for authenticated users"
    ON students
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create policies for book_issues table (allow all operations for authenticated users)
CREATE POLICY "Allow all operations on book_issues for authenticated users"
    ON book_issues
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for book_issues table
CREATE TRIGGER update_book_issues_updated_at
    BEFORE UPDATE ON book_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
