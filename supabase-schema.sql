-- Library Management System Database Schema

-- Create students table
-- Note: Composite primary key (reg_no, course) because EE (Unaided) and other courses (Aided)
-- have separate Reg No sequences that may overlap, representing different students
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

-- Create book_issues table
CREATE TABLE IF NOT EXISTS book_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_reg_no TEXT NOT NULL,
    student_course TEXT NOT NULL,
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
    FOREIGN KEY (student_reg_no, student_course) REFERENCES students(reg_no, course) ON DELETE CASCADE
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
