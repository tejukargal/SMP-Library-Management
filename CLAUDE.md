# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Library Management System for SMP Library Register - a web application for managing book issues and returns for both students and staff. The application is built with vanilla JavaScript (ES6+), HTML5, CSS3, and uses Supabase as the backend database.

**Key Features:**
- Student and staff book management
- Authentication system with session management
- Dashboard with real-time metrics
- Search with autocomplete
- Book issue and return tracking
- Data backup/restore (export/import JSON)
- PDF export functionality
- Edit issued book records
- Filters and advanced reporting

## Development Commands

### Running the Application
```bash
# Start local development server (preferred method)
npm run serve
# Opens http://localhost:8000 automatically

# Alternative: Python server
python -m http.server 8000
```

**Important**: The application MUST be served via HTTP server (not `file://` protocol) because it uses ES6 modules.

### Database Operations
```bash
# Import students from CSV to Supabase
npm run import

# Import staff from CSV to Supabase (if staff.csv exists)
npm run import:staff
```

## Architecture Overview

### Frontend Architecture
The application follows a single-page architecture with modal-based interactions:

1. **Authentication Layer**:
   - Login modal on app initialization
   - Session-based authentication (uses `sessionStorage`)
   - Multiple valid credentials (hardcoded)
   - Logout functionality clears session

2. **Main View** (`index.html`):
   - Header with hamburger menu (refresh, export/import, clear data, about, logout)
   - Dashboard with clickable metric cards (total students, issued, returned, pending books)
   - Unified search interface for students and staff
   - Results display with context menu for actions

3. **Modal Interactions** (9 modals):
   - `loginModal`: Authentication
   - `issueModal`: Issue new books (shows book history, supports autocomplete)
   - `returnModal`: Return books (checkbox-based selection)
   - `booksListModal`: Detailed view with filters and PDF export
   - `clearDataModal`: Confirm data deletion with password
   - `aboutModal`: App information and contributors
   - `studentsModal`: Course-wise student breakdown
   - Edit modal: Modify issued book records
   - Staff modals: Similar to student modals but for staff members

4. **State Management** (`app.js`, 2598 lines):
   - `supabase`: Supabase client instance
   - `selectedStudent`: Currently selected student for modal operations
   - `selectedStaff`: Currently selected staff member for modal operations
   - `bookEntryCount`: Tracks serial numbers for issued books
   - `allBooksData`: Global cache of all book issues for dashboard
   - `currentBooksListType`: Tracks which metric card was clicked ('issued', 'returned', 'pending')
   - Authentication state in `sessionStorage`

### Database Schema

**students** table:
- `reg_no` (TEXT, part of PRIMARY KEY): Student registration number
- `course` (TEXT, part of PRIMARY KEY): Course name (EE, CS, etc.)
- **Composite Primary Key**: `(reg_no, course)` - necessary because different courses (Aided vs Unaided) can have overlapping reg numbers
- `name`, `father`, `year`: Student details
- `in_out` (TEXT): Current status ('In' or 'Out'), default 'In'
- `created_at`: Timestamp

**staff** table (if implemented):
- `staff_id` (TEXT, PRIMARY KEY): Staff identifier
- `name`, `dept`, `designation`: Staff details
- `created_at`: Timestamp

**book_issues** table:
- `id` (UUID, PRIMARY KEY): Unique issue record
- `student_reg_no` (TEXT, part of FOREIGN KEY): References students(reg_no)
- `student_course` (TEXT, part of FOREIGN KEY): References students(course)
- **Composite Foreign Key**: `(student_reg_no, student_course)` references `students(reg_no, course)` with CASCADE delete
- `staff_id` (TEXT, nullable, FOREIGN KEY): References staff(staff_id) if issued to staff
- `book_name`, `author`, `book_no`: Book details
- `sem` (TEXT, nullable): Semester at time of issue (e.g., '1st Sem', '2nd Sem')
- `phone_no` (TEXT, nullable): Contact phone number
- `issue_date` (DATE): When book was issued
- `return_date` (DATE, nullable): When book was returned
- `status` (TEXT): 'issued' or 'returned' (CHECK constraint)
- `created_at`, `updated_at`: Timestamps (updated_at has automatic trigger)

**Indexes**:
- `idx_book_issues_student_reg_no`: Fast student lookups
- `idx_book_issues_status`: Fast status filtering
- `idx_students_name`: Fast name searches

**Important Schema Notes**:
- The composite primary key on students table is critical - never query by reg_no alone, always include course
- Book issues can be for either students OR staff (one will be NULL)
- RLS (Row Level Security) is enabled but currently allows all operations

### Key Application Features

1. **Authentication System** (app.js:10-17, 55-106):
   - Hardcoded credentials in `VALID_CREDENTIALS` array
   - Session-based auth using `sessionStorage`
   - Login modal blocks access until authenticated
   - Password-protected operations: clear data, export/import
   - Logout clears session and redirects to login

2. **Serial Number System**:
   - Serial numbers (Sl No.) are assigned based on count of currently issued books
   - When issuing books, `bookEntryCount` starts from the count of existing issued books
   - Each new book increments this counter
   - Serial numbers are read-only in the form

3. **Dashboard Metrics**:
   - Loads all book_issues with student/staff joins on init
   - Calculates: Total Students, Total Issued (all records), Total Returned (status='returned'), Total Pending (status='issued')
   - Clicking metric cards opens filtered book lists in modal
   - Supports both student and staff data

4. **Unified Search Functionality**:
   - Single search interface for both students and staff
   - Uses Supabase `.or()` query with `.ilike` for case-insensitive partial matching
   - Searches across: name, father name, reg_no (students) or staff_id, name, dept (staff)
   - Auto-converts search input to uppercase
   - Returns max 10 results
   - Shows book statistics (issued/returned counts) for each result

5. **Book Issue Operations**:
   - Autocomplete for book names and authors (based on existing books in database)
   - Form validation with visual error indicators
   - Support for semester and phone number fields
   - Shows complete book history (issued + returned) in issue modal
   - Inline editing of issued books (can modify details after issue)
   - Multiple books can be issued in one transaction

6. **Book Return Operations**:
   - Checkbox-based selection of issued books
   - Bulk return with automatic date stamping
   - Status automatically updated to 'returned'

7. **Data Management**:
   - **Export**: Download all data (students, staff, book_issues) as JSON with password protection
   - **Import**: Restore from JSON backup with password protection
   - **Clear Data**: Delete all book_issues while preserving students/staff (password protected)
   - All operations logged to console for debugging

8. **Filtering and Reporting**:
   - Books list modal with filters: Year, Course, Semester
   - "Clear Filters" button to reset all filters
   - PDF export functionality for filtered data
   - Groups books by borrower (student/staff) with details

### Configuration

**config.json** (gitignored):
```json
{
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your-anon-key"
}
```

**config.json.example**: Template for configuration

### Important Implementation Details

1. **Date Handling**:
   - All dates use ISO format (YYYY-MM-DD) for storage and queries
   - `getCurrentDate()`: Returns today's date in ISO format
   - `formatDate()`: Formats dates as "DD MMM YYYY" for display
   - Return dates are automatically set to today when books are returned

2. **Security**:
   - **Authentication**: Hardcoded credentials (change `VALID_CREDENTIALS` for production)
   - **Password Protection**: `CLEAR_DATA_PASSWORD` and `BACKUP_PASSWORD` protect destructive operations
   - **RLS**: Row Level Security enabled on all tables, currently permissive (allows all operations)
   - **Config**: Never commit config.json to version control (already in .gitignore)
   - **Session**: Auth state stored in sessionStorage (cleared on logout or browser close)

3. **Error Handling**:
   - Toast notifications for all user-facing errors and success messages
   - Console logging for debugging
   - Try-catch blocks around all async operations
   - Network error handling with user-friendly messages

4. **Data Validation**:
   - Form fields marked with `*` are required
   - Visual error indication (`.error` class) on invalid fields
   - Autocomplete prevents typos in book names/authors
   - Duplicate prevention in import script (by composite key: reg_no + course)
   - Phone number and semester fields are optional

5. **PDF Export**:
   - Opens new window with formatted HTML table
   - Applies current year/course/semester filters
   - Automatically triggers browser print dialog
   - Print-friendly CSS styles applied

6. **Composite Key Handling**:
   - **Critical**: Always query students using BOTH reg_no AND course
   - Book issues use `student_reg_no` + `student_course` for foreign key
   - Import scripts handle composite keys with deduplication
   - Search results properly handle composite keys

7. **Autocomplete System**:
   - Fetches unique book names and authors from existing book_issues
   - Provides datalist suggestions as user types
   - Reduces data entry errors and speeds up book entry

## Supabase Integration

The application uses `@supabase/supabase-js` v2 loaded via CDN (ESM):
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
```

Common query patterns:
```javascript
// Search students with OR conditions (case-insensitive)
.or(`name.ilike.%${term}%,father.ilike.%${term}%,reg_no.ilike.%${term}%`)

// Query by composite primary key (CRITICAL)
.eq('reg_no', regNo)
.eq('course', course)

// Join with students table (includes composite key fields)
.select('*, students(name, reg_no, course, year)')

// Filter and order book issues
.eq('student_reg_no', regNo)
.eq('student_course', course)
.eq('status', 'issued')
.order('issue_date', { ascending: false })

// Update multiple records
.update({ status: 'returned', return_date: date })
.in('id', bookIds)

// Batch upsert with composite key conflict resolution
.upsert(batch, { onConflict: 'reg_no,course' })

// Count queries for dashboard metrics
.select('*', { count: 'exact', head: true })
.eq('status', 'issued')
```

## Testing Workflow

1. Ensure config.json exists with valid Supabase credentials
2. Run `npm run serve` (opens http://localhost:8000 automatically)
3. Login with valid credentials (see `VALID_CREDENTIALS` in app.js)
4. Check browser console (F12) for any initialization errors
5. Test basic workflow:
   - Search for students/staff
   - Issue books (verify autocomplete works)
   - Return books (verify checkbox selection)
   - Check dashboard metrics update
   - Test filters in books list modal
6. Test data operations:
   - Export backup (requires password)
   - Clear data (requires password, confirm deletion works)
   - Import backup (verify data restoration)
7. Test edge cases:
   - Students with same reg_no but different courses
   - Books with semester and phone number fields
   - Edit functionality on issued books
   - Multiple book issues in single transaction

## File Structure

- `index.html`: Main HTML structure with 9 modals
- `app.js`: All application logic (2598 lines, single file)
- `styles.css`: Complete styling including responsive design
- `config.json`: Supabase credentials (gitignored)
- `config.json.example`: Configuration template
- `supabase-schema.sql`: Database schema with composite keys and RLS policies
- `migration-add-sem-phone.sql`: Migration to add semester and phone fields
- `migration-add-in-out.sql`: Migration to add in_out status field
- `fix-student-status.sql`: Fix script for student status issues
- `import-students.js`: Node.js script for CSV import (handles composite key duplicates, batching)
- `students.csv`: Source data for student import
- `staff.csv`: Source data for staff import (if exists)
- `update-student-status.js`: Script to update student in/out status

## Common Tasks

### Adding a New Field to Students Table
1. Create migration SQL file: `migration-add-field-name.sql`
2. Add column with `ALTER TABLE students ADD COLUMN field_name TYPE;`
3. Run SQL in Supabase dashboard SQL Editor
4. Update import script: `import-students.js` to handle new field
5. Update search display in `displayResults()` function
6. Update modal student info sections in issue/return modals
7. Update PDF export formatting if needed

### Modifying Book Issue Logic
1. Serial number logic: Find `addBookEntry()` function
2. Form submission: Find `submitIssueBooks()` function
3. Book history display: Find `loadPreviouslyIssuedBooks()` function
4. Autocomplete data: Find where book names/authors are fetched
5. Remember to handle both student and staff cases

### Changing Dashboard Metrics
1. Calculation logic: Find `loadDashboard()` function
2. Display: Update metric cards in `index.html` (inside `.metrics-grid`)
3. Books list filtering: Find `showBooksList()` function
4. Update click handlers for metric cards

### Adding New Authentication Credentials
1. Locate `VALID_CREDENTIALS` array at top of `app.js`
2. Add new credential object: `{ username: 'user', password: 'pass' }`
3. Update password constants (`CLEAR_DATA_PASSWORD`, `BACKUP_PASSWORD`) if needed

### Running Database Migrations
1. Create migration SQL file with descriptive name
2. Open Supabase dashboard → SQL Editor
3. Copy migration SQL and run
4. Verify changes in Table Editor
5. Update app.js to use new fields
6. Test thoroughly with existing data

## Notes for AI Assistants

- **File Size**: The entire frontend is in a single `app.js` file (2598 lines) - this is intentional for simplicity, not poor architecture
- **Global Functions**: Functions like `window.openIssueModalForStudent`, `window.openReturnModalForStudent`, `window.removeBookEntry` are exposed globally for inline onclick handlers in dynamically generated HTML
- **No Build Step**: The application has no build step or transpilation - it's pure vanilla JS with ES6 modules
- **Uppercase Convention**: All search inputs are auto-converted to uppercase via event listener
- **Serial Numbers**: The `bookEntryCount` variable is critical for maintaining correct serial numbers across issues - don't reset mid-session
- **Global Cache**: Dashboard data is stored globally (`allBooksData`) to avoid re-fetching when filtering in modals
- **Modal Management**: Modals use CSS classes (`.active`) for visibility, not inline styles
- **Composite Keys**: ALWAYS query students with both `reg_no` AND `course` - never use reg_no alone
- **Dual System**: The app handles both students and staff - most functions have parallel logic for both
- **Authentication**: All auth is client-side only (sessionStorage) - no server-side validation
- **Line Numbers**: Line number references in this doc may drift as code evolves - use function names and descriptions to locate code
