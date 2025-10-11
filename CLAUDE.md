# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Library Management System for SMP Library Register - a web application for managing book issues and returns for students. The application is built with vanilla JavaScript (ES6+), HTML5, CSS3, and uses Supabase as the backend database.

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
```

## Architecture Overview

### Frontend Architecture
The application follows a single-page architecture with modal-based interactions:

1. **Main View** (`index.html`): Contains three sections:
   - Dashboard with metrics cards (total issued, returned, pending books)
   - Search interface for finding students
   - Results display with action buttons

2. **Modal Interactions**: Three primary modals:
   - `issueModal`: Issue new books to a student (shows previously issued books + form for new books)
   - `returnModal`: Return books (checkbox-based selection of issued books)
   - `booksListModal`: Detailed view of books by type (issued/returned/pending) with filters and PDF export

3. **State Management** (`app.js`):
   - `supabase`: Supabase client instance
   - `selectedStudent`: Currently selected student for modal operations
   - `bookEntryCount`: Tracks serial numbers for issued books (increments with each issue)
   - `allBooksData`: Global cache of all book issues for dashboard
   - `currentBooksListType`: Tracks which metric card was clicked ('issued', 'returned', 'pending')

### Database Schema

**students** table:
- `reg_no` (TEXT, PRIMARY KEY): Student registration number
- `name`, `father`, `year`, `course`: Student details
- `created_at`: Timestamp

**book_issues** table:
- `id` (UUID, PRIMARY KEY): Unique issue record
- `student_reg_no` (TEXT, FOREIGN KEY): References students(reg_no) with CASCADE delete
- `book_name`, `author`, `book_no`: Book details
- `issue_date` (DATE): When book was issued
- `return_date` (DATE, nullable): When book was returned
- `status` (TEXT): 'issued' or 'returned'
- `created_at`, `updated_at`: Timestamps (updated_at has trigger)

**Indexes**:
- `idx_book_issues_student_reg_no`: Fast student lookups
- `idx_book_issues_status`: Fast status filtering
- `idx_students_name`: Fast name searches

### Key Application Features

1. **Serial Number System** (app.js:545-616):
   - Serial numbers (Sl No.) are assigned based on count of currently issued books
   - When issuing books, `bookEntryCount` starts from the count of existing issued books
   - Each new book increments this counter
   - Serial numbers are read-only in the form

2. **Dashboard Metrics** (app.js:107-133):
   - Loads all book_issues with student joins on init
   - Calculates: Total Issued (all records), Total Returned (status='returned'), Total Pending (status='issued')
   - Clicking metric cards opens filtered book lists in modal

3. **Search Functionality** (app.js:393-426):
   - Uses Supabase `.or()` query with `.ilike` for case-insensitive partial matching
   - Searches across: name, father name, reg_no
   - Auto-converts search input to uppercase
   - Returns max 10 results

4. **Book Statistics** (app.js:479-496):
   - Each search result shows count of issued/returned books for that student
   - Fetched asynchronously for all search results

5. **Modal Operations**:
   - Issue Books (app.js:535-563): Loads previously issued books, adds form for new books
   - Return Books (app.js:726-794): Lists all issued books with checkboxes
   - Books List (app.js:136-189): Filterable table grouped by student with PDF export

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
   - All dates use ISO format (YYYY-MM-DD)
   - `getCurrentDate()` (app.js:656): Returns today's date in ISO format
   - `formatDate()` (app.js:872): Formats dates as "DD MMM YYYY" for display

2. **Security**:
   - Row Level Security (RLS) enabled on both tables
   - Current policy allows all operations (consider restricting for production)
   - Never commit config.json to version control

3. **Error Handling**:
   - Toast notifications for all user-facing errors (app.js:854-863)
   - Console logging for debugging
   - Try-catch blocks around all async operations

4. **Data Validation**:
   - Form fields marked with `*` are required
   - Visual error indication (`.error` class) on invalid fields
   - Duplicate prevention in import script (by reg_no)

5. **PDF Export** (app.js:281-390):
   - Opens new window with formatted HTML table
   - Applies current year/course filters
   - Triggers browser print dialog

## Supabase Integration

The application uses `@supabase/supabase-js` v2 loaded via CDN (ESM):
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
```

Common query patterns:
```javascript
// Search with OR conditions
.or(`name.ilike.%${term}%,father.ilike.%${term}%,reg_no.ilike.%${term}%`)

// Join with students table
.select('*, students(name, reg_no, course, year)')

// Filter and order
.eq('student_reg_no', regNo)
.eq('status', 'issued')
.order('issue_date', { ascending: false })

// Update multiple records
.update({ status: 'returned', return_date: date })
.in('id', bookIds)

// Batch upsert
.upsert(batch, { onConflict: 'reg_no' })
```

## Testing Workflow

1. Ensure config.json exists with valid Supabase credentials
2. Run `npm run serve` or `python -m http.server 8000`
3. Open browser to http://localhost:8000
4. Check browser console (F12) for any initialization errors
5. Test search with known student names from students.csv
6. Test issue → return → dashboard refresh cycle

## File Structure

- `index.html`: Main HTML structure with three modals
- `app.js`: All application logic (880 lines, single file)
- `styles.css`: Complete styling including responsive design
- `config.json`: Supabase credentials (gitignored)
- `supabase-schema.sql`: Database schema with RLS policies
- `import-students.js`: Node.js script for CSV import (handles duplicates, batching)
- `students.csv`: Source data for import

## Common Tasks

### Adding a New Field to Students
1. Update `supabase-schema.sql` (ALTER TABLE)
2. Run SQL in Supabase dashboard
3. Update search display in `displayResults()` (app.js:429-476)
4. Update modal student info sections (app.js:539-542, 730-731)

### Modifying Book Issue Logic
1. Serial number logic: `addBookEntry()` (app.js:606-648)
2. Form submission: `submitIssueBooks()` (app.js:661-723)
3. Book counting: `loadPreviouslyIssuedBooks()` (app.js:567-603)

### Changing Dashboard Metrics
1. Calculation logic: `loadDashboard()` (app.js:107-133)
2. Display: Update metric cards in index.html (lines 18-44)
3. Books list filtering: `showBooksList()` (app.js:136-189)

## Notes for AI Assistants

- The entire frontend is in a single `app.js` file (880 lines) - this is intentional for simplicity
- Global functions (`window.openIssueModalForStudent`, `window.openReturnModalForStudent`, `window.removeBookEntry`) are used for inline onclick handlers
- The application has no build step or transpilation - it's pure vanilla JS
- All search inputs are auto-converted to uppercase via event listener
- The `bookEntryCount` variable is critical for maintaining correct serial numbers across issues
- Dashboard data is stored globally (`allBooksData`) to avoid re-fetching when filtering
- Modals use CSS classes (`.active`) for visibility, not inline styles
