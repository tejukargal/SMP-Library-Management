# Library Management System

A modern, responsive web application for managing library book issues and returns, built with HTML, CSS, JavaScript, and Supabase.

## Features

- **Student Search**: Search students by name, father's name, or registration number
- **Book Issue Management**: Issue multiple books to students with detailed tracking
- **Book Return System**: Easy return process with visual book selection
- **Real-time Database**: Powered by Supabase for reliable data storage
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Context Menu**: Right-click interface for quick actions
- **Form Validation**: Comprehensive error handling and data validation

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: GitHub Pages
- **Libraries**: Supabase JavaScript Client

## Prerequisites

- A Supabase account (free tier available at [supabase.com](https://supabase.com))
- Git installed on your machine
- A GitHub account (for deployment)

## Setup Instructions

### 1. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the database to initialize (usually takes 1-2 minutes)

#### Run Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from this repository
3. Paste it into the SQL Editor and click **Run**
4. This will create:
   - `students` table
   - `book_issues` table
   - Indexes for performance
   - Row Level Security policies

#### Get API Credentials

1. Go to **Project Settings** > **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (a long string starting with `eyJ...`)

### 2. Import Students Data

#### Option A: Using Supabase Dashboard (Recommended)

1. In Supabase dashboard, go to **Table Editor**
2. Select the `students` table
3. Click **Insert** > **Import data from CSV**
4. Upload `students.csv`
5. Map the CSV columns:
   - `Student Name` → `name`
   - `Father Name` → `father`
   - `Year` → `year`
   - `Course` → `course`
   - `Reg No` → `reg_no`
6. Click **Import**

#### Option B: Using Import Script (Node.js)

1. Install Node.js if not already installed
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js csv-parse
   ```
3. Create `config.json` (see step 3 below)
4. Run the import script:
   ```bash
   node import-students.js
   ```

### 3. Configure the Application

1. Copy the example config file:
   ```bash
   cp config.json.example config.json
   ```

2. Edit `config.json` with your Supabase credentials:
   ```json
   {
     "supabaseUrl": "https://your-project-id.supabase.co",
     "supabaseAnonKey": "your-anon-key-here"
   }
   ```

3. **Important**: Never commit `config.json` to version control (it's already in `.gitignore`)

### 4. Local Testing

1. You need a local web server to test (browsers block ES modules on `file://` protocol)
2. Options:

   **Using Python:**
   ```bash
   # Python 3
   python -m http.server 8000
   ```

   **Using Node.js:**
   ```bash
   npx http-server
   ```

   **Using VS Code:**
   - Install "Live Server" extension
   - Right-click `index.html` and select "Open with Live Server"

3. Open your browser and navigate to `http://localhost:8000`

## Deployment to GitHub Pages

### 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: Library Management System"
git branch -M main
git remote add origin https://github.com/yourusername/library-management.git
git push -u origin main
```

### 2. Configure for GitHub Pages

1. Create `config.json` in the repository with your Supabase credentials
2. Commit and push:
   ```bash
   git add config.json
   git commit -m "Add configuration"
   git push
   ```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Under **Source**, select `main` branch
4. Click **Save**
5. Your site will be available at: `https://yourusername.github.io/library-management/`

### 4. Update Configuration (Production)

For production, consider using environment-specific configs or GitHub Secrets for better security:

1. Create a GitHub Action to inject config at build time, or
2. Use a separate branch for deployment with production config

## Usage Guide

### Search for Students

1. Enter a student name, father's name, or registration number in the search box
2. Click **Search** or press Enter
3. Results will appear below the search box

### Issue Books

1. Right-click on a student from the search results
2. Select **Issue Books** from the context menu
3. Fill in the book details:
   - Book Name
   - Author
   - Book Number
   - Date of Issue
4. Click **Add Another Book** to issue multiple books
5. Click **Issue Books** to save

### Return Books

1. Right-click on a student from the search results
2. Select **Return Books** from the context menu
3. Check the boxes next to the books to return
4. Click **Return Selected Books**
5. The books will be marked as returned with today's date

## Database Schema

### Students Table

| Column    | Type | Description            |
|-----------|------|------------------------|
| reg_no    | TEXT | Primary key            |
| name      | TEXT | Student name           |
| father    | TEXT | Father's name          |
| year      | TEXT | Academic year          |
| course    | TEXT | Course enrolled        |
| created_at| TIMESTAMP | Record creation time |

### Book Issues Table

| Column           | Type      | Description                    |
|------------------|-----------|--------------------------------|
| id               | UUID      | Primary key                    |
| student_reg_no   | TEXT      | Foreign key to students        |
| book_name        | TEXT      | Name of the book               |
| author           | TEXT      | Book author                    |
| book_no          | TEXT      | Book number/code               |
| issue_date       | DATE      | Date book was issued           |
| return_date      | DATE      | Date book was returned (null if not returned) |
| status           | TEXT      | 'issued' or 'returned'         |
| created_at       | TIMESTAMP | Record creation time           |
| updated_at       | TIMESTAMP | Last update time               |

## Security Considerations

### Row Level Security

The database uses Supabase Row Level Security (RLS) policies. Current configuration:
- All authenticated users can read/write all tables
- Consider implementing more restrictive policies for production:
  - Read-only access for students
  - Write access only for librarians
  - Role-based access control

### API Key Security

- Never commit `config.json` to public repositories
- For production, use environment variables or secure key management
- Consider using Supabase Auth for user authentication
- Rotate API keys periodically

## Troubleshooting

### Application won't load

- Check browser console for errors (F12)
- Verify `config.json` exists and has correct credentials
- Ensure you're running from a web server (not `file://`)

### Search returns no results

- Check if students data was imported successfully (Supabase Table Editor)
- Verify database connection in browser console
- Check RLS policies are correctly configured

### Books not issuing/returning

- Check browser console for error messages
- Verify book_issues table exists and has correct schema
- Ensure foreign key relationship between tables is working

## File Structure

```
library-management/
├── index.html              # Main HTML file
├── styles.css              # Application styles
├── app.js                  # Main JavaScript application
├── config.json.example     # Configuration template
├── config.json             # Your configuration (not in git)
├── .gitignore              # Git ignore rules
├── supabase-schema.sql     # Database schema
├── import-students.js      # CSV import script
├── students.csv            # Student data
└── README.md               # This file
```

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Book inventory management
- [ ] Due date reminders
- [ ] Fine calculation system
- [ ] Analytics dashboard
- [ ] PDF report generation
- [ ] Email notifications
- [ ] Mobile app version
- [ ] Barcode scanning
- [ ] Advanced search filters

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Supabase documentation at [supabase.com/docs](https://supabase.com/docs)
3. Open an issue on GitHub

## Acknowledgments

- Built with [Supabase](https://supabase.com)
- Icons from Unicode emoji set
- Modern CSS design patterns

---

Made with ❤️ for educational purposes
