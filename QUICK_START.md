# Quick Start Guide

Get your Library Management System up and running in 5 minutes!

## Step 1: Create Supabase Project (2 minutes)

1. Go to https://supabase.com and sign up (free)
2. Click "New Project"
3. Fill in:
   - Project name: "library-management"
   - Database password: (save this securely)
   - Region: (choose closest to you)
4. Click "Create new project" and wait ~2 minutes

## Step 2: Setup Database (1 minute)

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Open `supabase-schema.sql` from this folder
4. Copy all contents and paste into SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 3: Import Students (1 minute)

### Option A: Using Supabase Dashboard (Easier)

1. Go to **Table Editor** > **students** table
2. Click **Insert** > **Import data from CSV**
3. Select your `students.csv` file
4. Map columns:
   ```
   CSV Column       → Database Column
   "Student Name"   → name
   "Father Name"    → father
   "Year"           → year
   "Course"         → course
   "Reg No"         → reg_no
   ```
5. Click **Import**

### Option B: Using Script (Requires Node.js)

```bash
npm install
npm run import
```

## Step 4: Configure App (30 seconds)

1. In Supabase, go to **Settings** > **API**
2. Copy:
   - Project URL
   - Anon/public key

3. Rename `config.json.example` to `config.json`
4. Edit `config.json`:
   ```json
   {
     "supabaseUrl": "PASTE_PROJECT_URL_HERE",
     "supabaseAnonKey": "PASTE_ANON_KEY_HERE"
   }
   ```

## Step 5: Run Locally (30 seconds)

Choose one method:

### Method A: Using Python
```bash
python -m http.server 8000
```

### Method B: Using Node.js
```bash
npm install
npm run serve
```

### Method C: Using VS Code
1. Install "Live Server" extension
2. Right-click `index.html`
3. Click "Open with Live Server"

## Step 6: Test It Out!

1. Open http://localhost:8000
2. Search for a student name from your CSV
3. Right-click a result
4. Try issuing a book!

## Deploy to GitHub Pages (Optional)

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/library-management.git
git push -u origin main

# Enable GitHub Pages
# Go to Settings > Pages > Select "main" branch > Save
```

Your app will be live at: `https://YOUR_USERNAME.github.io/library-management/`

## Common Issues

**"Failed to initialize application"**
- Check if `config.json` exists
- Verify your Supabase credentials are correct

**"No students found"**
- Check if students were imported (Supabase Table Editor)
- Try searching for a simple term like "A"

**"Cannot load local file"**
- You must use a web server (Python, Node, or VS Code)
- Browsers block ES modules on file:// protocol

## Need Help?

1. Check `README.md` for detailed instructions
2. Review Supabase docs: https://supabase.com/docs
3. Check browser console (F12) for error messages

---

**That's it! You're ready to manage your library! 📚**
