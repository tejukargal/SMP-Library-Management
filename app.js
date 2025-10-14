// Library Management System - Main Application
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Application State
let supabase = null;
let selectedStudent = null;
let bookEntryCount = 0;

// Authentication credentials
const VALID_CREDENTIALS = [
    { username: 'admin', password: 'anandamc' },
    { username: 'admin', password: 'teju2015' }
];

const CLEAR_DATA_PASSWORD = 'teju2015';
const BACKUP_PASSWORD = 'teju2015'; // Password for export/import operations

// Initialize Application
async function init() {
    try {
        // Setup login event listener first (needed for login to work)
        setupLoginListeners();

        // Check authentication
        if (!checkAuth()) {
            showLoginModal();
            return;
        }

        // Load configuration
        const config = await loadConfig();

        // Initialize Supabase
        supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Setup event listeners
        setupEventListeners();

        // Load dashboard data
        await loadDashboard();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize application. Check config.json', 'error');
    }
}

// Setup Login Event Listeners (must be done before auth check)
function setupLoginListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Authentication Functions
function checkAuth() {
    return sessionStorage.getItem('authenticated') === 'true';
}

function setAuth(value) {
    sessionStorage.setItem('authenticated', value.toString());
}

function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    // Hide main content
    document.querySelector('main').style.display = 'none';
    document.querySelector('header').style.display = 'none';
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    // Show main content
    document.querySelector('main').style.display = 'block';
    document.querySelector('header').style.display = 'block';
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    // Validate credentials
    const isValid = VALID_CREDENTIALS.some(
        cred => cred.username === username && cred.password === password
    );

    if (isValid) {
        setAuth(true);
        errorDiv.style.display = 'none';
        hideLoginModal();

        // Initialize app after successful login
        try {
            const config = await loadConfig();
            supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

            // Setup all event listeners
            setupEventListeners();

            // Load dashboard
            await loadDashboard();

            showToast('Login successful!', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Failed to initialize application', 'error');
        }
    } else {
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.style.display = 'block';
        document.getElementById('loginPassword').value = '';
    }
}

function handleLogout() {
    setAuth(false);
    sessionStorage.clear();
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Hamburger Menu Functions
function openHamburgerMenu() {
    document.getElementById('hamburgerMenu').classList.add('active');
    document.getElementById('menuOverlay').classList.add('active');
    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
}

function closeHamburgerMenu() {
    document.getElementById('hamburgerMenu').classList.remove('active');
    document.getElementById('menuOverlay').classList.remove('active');
    // Restore body scroll
    document.body.style.overflow = '';
}

// Load Configuration
async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        if (!response.ok) {
            throw new Error('Config file not found');
        }
        return await response.json();
    } catch (error) {
        console.error('Config loading error:', error);
        throw new Error('Please create config.json with your Supabase credentials');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Hamburger menu
    document.getElementById('hamburgerMenuBtn').addEventListener('click', openHamburgerMenu);
    document.getElementById('closeMenuBtn').addEventListener('click', closeHamburgerMenu);
    document.getElementById('menuOverlay').addEventListener('click', closeHamburgerMenu);

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        closeHamburgerMenu();
        handleLogout();
    });

    // Export and Import buttons
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        closeHamburgerMenu();
        handleExportData();
    });
    document.getElementById('importDataBtn').addEventListener('click', () => {
        closeHamburgerMenu();
        handleImportData();
    });
    document.getElementById('importFileInput').addEventListener('change', processImportFile);

    // Clear data button
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        closeHamburgerMenu();
        openClearDataModal();
    });
    document.getElementById('cancelClearBtn').addEventListener('click', () => closeModal('clearDataModal'));
    document.getElementById('confirmClearBtn').addEventListener('click', handleClearData);

    // About button
    document.getElementById('aboutBtn').addEventListener('click', () => {
        closeHamburgerMenu();
        showModal('aboutModal');
    });
    document.getElementById('closeAboutBtn').addEventListener('click', () => closeModal('aboutModal'));

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    // Convert search input to uppercase dynamically and restore dashboard list when cleared
    searchInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();

        // If search is cleared, restore dashboard students list
        if (e.target.value.trim() === '') {
            loadDashboardStudentsList();
        }
    });

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Issue Modal
    document.getElementById('addBookBtn').addEventListener('click', addBookEntry);
    document.getElementById('submitIssueBtn').addEventListener('click', submitIssueBooks);
    document.getElementById('cancelIssueBtn').addEventListener('click', () => closeModal('issueModal'));

    // Return Modal
    document.getElementById('submitReturnBtn').addEventListener('click', submitReturnBooks);
    document.getElementById('cancelReturnBtn').addEventListener('click', () => closeModal('returnModal'));

    // Dashboard and metric cards
    document.getElementById('refreshDashboardBtn').addEventListener('click', loadDashboard);
    document.getElementById('studentsCard').addEventListener('click', showStudentsBreakdown);
    document.getElementById('issuedCard').addEventListener('click', () => showBooksList('issued'));
    document.getElementById('returnedCard').addEventListener('click', () => showBooksList('returned'));
    document.getElementById('pendingCard').addEventListener('click', () => showBooksList('pending'));

    // Books list modal
    document.getElementById('closeBooksListBtn').addEventListener('click', () => closeModal('booksListModal'));
    document.getElementById('booksYearFilter').addEventListener('change', filterBooksList);
    document.getElementById('booksCourseFilter').addEventListener('change', filterBooksList);
    document.getElementById('booksSemFilter').addEventListener('change', filterBooksList);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    document.getElementById('exportPdfBtn').addEventListener('click', exportBooksListToPDF);

    // Students modal
    document.getElementById('closeStudentsBtn').addEventListener('click', () => closeModal('studentsModal'));

    // Close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            closeModal(modalId);
        });
    });

    // Close modal on backdrop click (but not for login modal)
    document.querySelectorAll('.modal:not(.modal-login)').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Global variables to store books data
let allBooksData = [];
let currentBooksListType = 'pending';
let studentsData = null; // Cache for students data

// Clear Data Functions
function openClearDataModal() {
    document.getElementById('clearDataPassword').value = '';
    document.getElementById('clearDataError').style.display = 'none';
    showModal('clearDataModal');
}

async function handleClearData() {
    const password = document.getElementById('clearDataPassword').value;
    const errorDiv = document.getElementById('clearDataError');

    // Validate password
    if (password !== CLEAR_DATA_PASSWORD) {
        errorDiv.textContent = 'Incorrect password. Access denied.';
        errorDiv.style.display = 'block';
        return;
    }

    // Confirm deletion
    const confirmed = confirm(
        'Are you absolutely sure you want to delete ALL book records?\n\n' +
        'This will delete:\n' +
        '- All book issue records\n' +
        '- All book return records\n\n' +
        'Student data will be preserved.\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Click OK to proceed or Cancel to abort.'
    );

    if (!confirmed) {
        return;
    }

    try {
        // Delete all records from book_issues table
        const { error } = await supabase
            .from('book_issues')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (error) throw error;

        showToast('All book data has been deleted successfully', 'success');
        closeModal('clearDataModal');

        // Reload dashboard (clears search and shows dashboard list)
        await loadDashboard();
    } catch (error) {
        console.error('Clear data error:', error);
        errorDiv.textContent = 'Failed to delete data: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

// Export Data Functions
async function handleExportData() {
    // Prompt for password
    const password = prompt('Enter password to export backup:');

    if (!password) {
        showToast('Export cancelled', 'warning');
        return;
    }

    if (password !== BACKUP_PASSWORD) {
        showToast('Incorrect password. Access denied.', 'error');
        return;
    }

    try {
        showToast('Preparing data export...', 'info');

        // Fetch all students
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('*')
            .order('name');

        if (studentsError) throw studentsError;

        // Fetch all book issues
        const { data: bookIssues, error: booksError } = await supabase
            .from('book_issues')
            .select('*')
            .order('created_at');

        if (booksError) throw booksError;

        // Create backup object
        const backupData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            exportedBy: 'SMP Library Management System',
            students: students || [],
            book_issues: bookIssues || [],
            statistics: {
                totalStudents: students?.length || 0,
                totalBookRecords: bookIssues?.length || 0,
                issuedBooks: bookIssues?.filter(b => b.status === 'issued').length || 0,
                returnedBooks: bookIssues?.filter(b => b.status === 'returned').length || 0
            }
        };

        // Convert to JSON
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `SMP_Library_Backup_${timestamp}.json`;

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message with file location
        showToast(
            `✅ Data exported successfully!\n\nFile: ${filename}\nLocation: Downloads folder\n\nStudents: ${backupData.statistics.totalStudents} | Books: ${backupData.statistics.totalBookRecords}`,
            'success'
        );

        console.log('Export completed:', filename);
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export data: ' + error.message, 'error');
    }
}

// Import Data Functions
async function handleImportData() {
    // Prompt for password
    const password = prompt('Enter password to import backup:');

    if (!password) {
        showToast('Import cancelled', 'warning');
        return;
    }

    if (password !== BACKUP_PASSWORD) {
        showToast('Incorrect password. Access denied.', 'error');
        return;
    }

    // Trigger file input click
    const fileInput = document.getElementById('importFileInput');
    fileInput.value = ''; // Reset file input
    fileInput.click();
}

// Handle file selection and import
async function processImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
        showToast('Please select a valid JSON backup file', 'error');
        return;
    }

    try {
        showToast('Reading backup file...', 'info');

        // Read file content
        const fileContent = await file.text();
        const backupData = JSON.parse(fileContent);

        // Validate backup structure
        if (!backupData.version || !backupData.students || !backupData.book_issues) {
            throw new Error('Invalid backup file structure');
        }

        // Confirm restore operation
        const confirmed = confirm(
            `⚠️ RESTORE DATA FROM BACKUP\n\n` +
            `Backup Date: ${new Date(backupData.exportDate).toLocaleString()}\n` +
            `Students: ${backupData.students.length}\n` +
            `Book Records: ${backupData.book_issues.length}\n\n` +
            `This will:\n` +
            `- ADD missing students from backup\n` +
            `- ADD missing book records from backup\n` +
            `- KEEP existing data (no deletions)\n\n` +
            `Continue with restore?`
        );

        if (!confirmed) {
            showToast('Import cancelled', 'warning');
            return;
        }

        showToast('Restoring data... Please wait', 'info');

        let studentsAdded = 0;
        let studentsUpdated = 0;
        let booksAdded = 0;
        let errors = [];

        // Restore students (using upsert to avoid duplicates)
        if (backupData.students.length > 0) {
            try {
                console.log('Restoring students...', backupData.students.length);

                // Students table has composite primary key (reg_no, course)
                // Process in smaller batches to avoid issues
                const batchSize = 50;
                for (let i = 0; i < backupData.students.length; i += batchSize) {
                    const batch = backupData.students.slice(i, i + batchSize);

                    const { data, error } = await supabase
                        .from('students')
                        .upsert(batch, {
                            onConflict: 'reg_no,course',
                            ignoreDuplicates: false
                        });

                    if (error) {
                        console.error('Student batch error:', error, batch);
                        throw error;
                    }

                    studentsAdded += batch.length;
                    console.log(`Students batch ${i / batchSize + 1} completed`);
                }

                console.log('Students restore completed:', studentsAdded);
            } catch (error) {
                console.error('Student restore error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                errors.push('Students: ' + error.message + (error.hint ? ' (' + error.hint + ')' : ''));
            }
        }

        // Restore book issues (using upsert with id)
        if (backupData.book_issues.length > 0) {
            try {
                console.log('Restoring book issues...', backupData.book_issues.length);

                // Batch import in chunks of 50 to avoid timeouts
                const chunkSize = 50;
                for (let i = 0; i < backupData.book_issues.length; i += chunkSize) {
                    const chunk = backupData.book_issues.slice(i, i + chunkSize);

                    const { data, error } = await supabase
                        .from('book_issues')
                        .upsert(chunk, {
                            onConflict: 'id',
                            ignoreDuplicates: false
                        });

                    if (error) {
                        console.error('Book issues batch error:', error, chunk);
                        throw error;
                    }

                    booksAdded += chunk.length;

                    // Show progress for large imports
                    if (backupData.book_issues.length > chunkSize) {
                        const progress = Math.min(100, Math.round((i + chunk.length) / backupData.book_issues.length * 100));
                        showToast(`Restoring books... ${progress}%`, 'info');
                    }

                    console.log(`Book issues batch ${i / chunkSize + 1} completed`);
                }

                console.log('Book issues restore completed:', booksAdded);
            } catch (error) {
                console.error('Book issues restore error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                errors.push('Book Issues: ' + error.message + (error.hint ? ' (' + error.hint + ')' : ''));
            }
        }

        // Reload dashboard to show updated data
        await loadDashboard();

        // Show results
        if (errors.length > 0) {
            showToast(
                `⚠️ Restore completed with errors:\n\n${errors.join('\n')}\n\nStudents: ${studentsAdded} | Books: ${booksAdded}`,
                'warning'
            );
        } else {
            showToast(
                `✅ Data restored successfully!\n\nStudents restored: ${studentsAdded}\nBook records restored: ${booksAdded}`,
                'success'
            );
        }

        console.log('Import completed:', { studentsAdded, booksAdded, errors });
    } catch (error) {
        console.error('Import error:', error);
        showToast('Failed to import data: ' + error.message, 'error');
    }
}

// Load Dashboard Metrics
async function loadDashboard() {
    try {
        // Show loading state on dashboard metrics
        const metricsValues = ['totalIssuedBooks', 'totalReturnedBooks', 'totalPendingBooks', 'totalStudents'];
        metricsValues.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = '...';
        });

        // Get all book issues (optimized with select only needed fields)
        const { data: allBooks, error } = await supabase
            .from('book_issues')
            .select('*, students(name, reg_no, course, year)');

        if (error) throw error;

        // Store globally
        allBooksData = allBooks || [];

        // Calculate book metrics
        const totalIssued = allBooks ? allBooks.length : 0;
        const returnedBooks = allBooks ? allBooks.filter(book => book.status === 'returned') : [];
        const issuedBooks = allBooks ? allBooks.filter(book => book.status === 'issued') : [];
        const totalReturned = returnedBooks.length;
        const totalPending = issuedBooks.length;

        document.getElementById('totalIssuedBooks').textContent = totalIssued;
        document.getElementById('totalReturnedBooks').textContent = totalReturned;
        document.getElementById('totalPendingBooks').textContent = totalPending;

        // Load students count
        await loadStudentsCount();

        // Clear search input and load dashboard students list
        document.getElementById('searchInput').value = '';
        await loadDashboardStudentsList();
    } catch (error) {
        console.error('Load dashboard error:', error);
        showToast('Error loading dashboard data', 'error');

        // Reset metrics to 0 on error
        ['totalIssuedBooks', 'totalReturnedBooks', 'totalPendingBooks', 'totalStudents'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = '0';
        });
    }
}

// Load Students Count - Only 'In' status students
async function loadStudentsCount() {
    try {
        // Fetch all students with 'In' status (or null, which defaults to 'In')
        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .or('in_out.eq.In,in_out.is.null')
            .order('course, name');

        if (error) throw error;

        // Store globally
        studentsData = students || [];

        // Count unique students by (reg_no, course) combination
        // EE (Unaided) and other courses (Aided) have separate Reg No sequences that may overlap
        const uniqueStudents = new Set();
        students?.forEach(student => {
            const uniqueKey = `${student.reg_no}_${student.course}`;
            uniqueStudents.add(uniqueKey);
        });

        const totalStudents = uniqueStudents.size;
        document.getElementById('totalStudents').textContent = totalStudents;

        console.log('Total students counted:', totalStudents);
    } catch (error) {
        console.error('Load students count error:', error);
        document.getElementById('totalStudents').textContent = '0';
    }
}

// Show Students Course-wise Breakdown
async function showStudentsBreakdown() {
    if (!studentsData) {
        showToast('Loading students data...', 'info');
        await loadStudentsCount();
    }

    // Get all years and courses
    const yearCourseMatrix = {};
    const years = new Set();
    const courses = new Set();

    studentsData?.forEach(student => {
        const year = student.year || 'Unknown';
        const course = student.course || 'Unknown';
        years.add(year);
        courses.add(course);

        if (!yearCourseMatrix[year]) {
            yearCourseMatrix[year] = {};
        }
        if (!yearCourseMatrix[year][course]) {
            yearCourseMatrix[year][course] = 0;
        }
        yearCourseMatrix[year][course]++;
    });

    // Fetch book statistics by year and course
    const { data: bookIssues, error } = await supabase
        .from('book_issues')
        .select('*, students(year, course)');

    if (error) {
        console.error('Error fetching book issues:', error);
    }

    // Count books issued (all) and pending (status='issued') by year and course
    const booksIssuedMatrix = {};
    const booksPendingMatrix = {};

    bookIssues?.forEach(book => {
        const year = book.students?.year || 'Unknown';
        const course = book.students?.course || 'Unknown';

        // Books Issued (all records)
        if (!booksIssuedMatrix[year]) {
            booksIssuedMatrix[year] = {};
        }
        if (!booksIssuedMatrix[year][course]) {
            booksIssuedMatrix[year][course] = 0;
        }
        booksIssuedMatrix[year][course]++;

        // Books Pending (status='issued')
        if (book.status === 'issued') {
            if (!booksPendingMatrix[year]) {
                booksPendingMatrix[year] = {};
            }
            if (!booksPendingMatrix[year][course]) {
                booksPendingMatrix[year][course] = 0;
            }
            booksPendingMatrix[year][course]++;
        }
    });

    const sortedYears = Array.from(years).sort();
    const sortedCourses = Array.from(courses).sort();

    // Calculate totals
    const totalStudents = studentsData?.length || 0;

    // Helper function to create a table
    const createTable = (title, matrix, isStudentTable = false) => {
        const rowTotals = {};
        const colTotals = {};
        let grandTotal = 0;

        sortedYears.forEach(year => {
            rowTotals[year] = 0;
            sortedCourses.forEach(course => {
                const count = matrix[year]?.[course] || 0;
                rowTotals[year] += count;
                colTotals[course] = (colTotals[course] || 0) + count;
                grandTotal += count;
            });
        });

        return `
            <div class="breakdown-table-section">
                <h4 style="margin: 1rem 0 0.5rem 0; color: #1e40af; font-size: 1rem;">${title}</h4>
                <table class="breakdown-table">
                    <thead>
                        <tr>
                            <th>Year</th>
                            ${sortedCourses.map(course => `<th>${course}</th>`).join('')}
                            <th style="background-color: #1e40af;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedYears.map(year => `
                            <tr>
                                <td><strong>${year}</strong></td>
                                ${sortedCourses.map(course => {
                                    const count = matrix[year]?.[course] || 0;
                                    return `<td>${count || '-'}</td>`;
                                }).join('')}
                                <td style="background-color: #eff6ff; font-weight: 600;">${rowTotals[year]}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #1e40af; color: white; font-weight: 600;">
                            <td>Total</td>
                            ${sortedCourses.map(course => `<td>${colTotals[course] || 0}</td>`).join('')}
                            <td>${grandTotal}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    };

    const container = document.getElementById('studentsBreakdownContainer');

    if (sortedYears.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>No students data available</p>
            </div>
        `;
    } else {
        const breakdownHtml = `
            <div style="text-align: center; padding: 0.75rem; margin-bottom: 1rem; background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #2563eb;">
                <div style="font-size: 1.5rem; font-weight: 700; color: #1e40af; margin-bottom: 0.25rem;">${totalStudents}</div>
                <div style="font-size: 0.9rem; color: #1e40af; font-weight: 500;">Total Students (In Status)</div>
            </div>

            ${createTable('📊 Students Count', yearCourseMatrix, true)}
            ${createTable('📚 Books Issued (Total)', booksIssuedMatrix)}
            ${createTable('⏳ Books Pending (Not Returned)', booksPendingMatrix)}

            <div style="text-align: center; padding: 0.5rem; margin-top: 1rem; background-color: #f1f5f9; border-radius: 6px; font-size: 0.8rem; color: #64748b;">
                <strong>Note:</strong> EE (Unaided) and other courses (Aided) have separate Reg No sequences. Each student counted by (Reg No + Course).
            </div>
        `;

        container.innerHTML = breakdownHtml;
    }

    showModal('studentsModal');
}

// Load Dashboard Students List (students with book activity)
async function loadDashboardStudentsList() {
    const resultsContainer = document.getElementById('resultsContainer');

    try {
        // Get all students who have book activity
        const { data: studentsWithBooks, error } = await supabase
            .from('book_issues')
            .select('student_reg_no, students(reg_no, name, father, year, course)')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Get unique students (deduplicate by reg_no)
        const uniqueStudentsMap = new Map();
        studentsWithBooks?.forEach(record => {
            const student = record.students;
            if (student && !uniqueStudentsMap.has(student.reg_no)) {
                uniqueStudentsMap.set(student.reg_no, student);
            }
        });

        const students = Array.from(uniqueStudentsMap.values());

        if (students.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>📚 No students with book activity yet</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Search for students to issue books</p>
                </div>
            `;
            return;
        }

        // Display students using the same displayResults function
        await displayResults(students);
    } catch (error) {
        console.error('Load dashboard students error:', error);
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <p>🔍 Enter a search term to find students</p>
            </div>
        `;
    }
}

// Show Books List Modal
async function showBooksList(type) {
    currentBooksListType = type;

    // Set modal title
    const titles = {
        'issued': '📚 Total Issued Books List',
        'returned': '✅ Total Returned Books List',
        'pending': '⏳ Pending Books List'
    };
    document.getElementById('booksListTitle').textContent = titles[type];

    // Filter books by type
    let books;
    if (type === 'issued') {
        books = allBooksData; // All books (issued + returned)
    } else if (type === 'returned') {
        books = allBooksData.filter(book => book.status === 'returned');
    } else {
        books = allBooksData.filter(book => book.status === 'issued'); // Pending
    }

    // Group by student
    const studentsWithBooks = {};
    books.forEach(book => {
        const regNo = book.student_reg_no;
        if (!studentsWithBooks[regNo]) {
            studentsWithBooks[regNo] = {
                ...book.students,
                books: []
            };
        }
        studentsWithBooks[regNo].books.push(book);
    });

    const studentsArray = Object.values(studentsWithBooks);

    // Populate filter dropdowns
    const years = [...new Set(studentsArray.map(s => s.year))].sort();
    const courses = [...new Set(studentsArray.map(s => s.course))].sort();

    // Get all unique semesters from books
    const semesters = [...new Set(books.map(b => b.sem).filter(s => s))].sort();

    const yearFilter = document.getElementById('booksYearFilter');
    const courseFilter = document.getElementById('booksCourseFilter');
    const semFilter = document.getElementById('booksSemFilter');

    yearFilter.innerHTML = '<option value="">All Years</option>' +
        years.map(year => `<option value="${year}">${year}</option>`).join('');
    courseFilter.innerHTML = '<option value="">All Courses</option>' +
        courses.map(course => `<option value="${course}">${course}</option>`).join('');
    semFilter.innerHTML = '<option value="">All Semesters</option>' +
        semesters.map(sem => `<option value="${sem}">${sem}</option>`).join('');

    // Display the list
    displayBooksList(studentsArray);

    // Show modal
    showModal('booksListModal');
}

// Display Books List
function displayBooksList(students) {
    const container = document.getElementById('booksListContainer');

    if (students.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>✨ No data available</p>
            </div>
        `;
        return;
    }

    // Flatten the structure to show one row per book
    const bookRows = [];
    students.forEach(student => {
        student.books.forEach(book => {
            bookRows.push({
                studentName: student.name,
                regNo: student.reg_no,
                year: student.year,
                course: student.course,
                bookName: book.book_name,
                author: book.author,
                bookNo: book.book_no,
                sem: book.sem,
                phoneNo: book.phone_no,
                issueDate: book.issue_date,
                returnDate: book.return_date,
                status: book.status
            });
        });
    });

    const tableHtml = `
        <table class="students-table">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Name</th>
                    <th>Reg No</th>
                    <th>Year</th>
                    <th>Course</th>
                    <th>Sem</th>
                    <th>Book Name</th>
                    <th>Author</th>
                    <th>Book No</th>
                    <th>Phone No</th>
                    <th>Issue Date</th>
                    ${currentBooksListType === 'returned' || currentBooksListType === 'issued' ? '<th>Return Date</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${bookRows.map((row, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(row.studentName)}</td>
                        <td>${escapeHtml(row.regNo)}</td>
                        <td>${escapeHtml(row.year)}</td>
                        <td>${escapeHtml(row.course)}</td>
                        <td>${row.sem || '-'}</td>
                        <td>${escapeHtml(row.bookName)}</td>
                        <td>${escapeHtml(row.author)}</td>
                        <td>${escapeHtml(row.bookNo)}</td>
                        <td>${row.phoneNo || '-'}</td>
                        <td>${formatDate(row.issueDate)}</td>
                        ${currentBooksListType === 'returned' || currentBooksListType === 'issued' ? `<td>${row.returnDate ? formatDate(row.returnDate) : '-'}</td>` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHtml;
}

// Filter Books List
function filterBooksList() {
    const yearFilter = document.getElementById('booksYearFilter').value;
    const courseFilter = document.getElementById('booksCourseFilter').value;
    const semFilter = document.getElementById('booksSemFilter').value;

    // Get current type books
    let books;
    if (currentBooksListType === 'issued') {
        books = allBooksData;
    } else if (currentBooksListType === 'returned') {
        books = allBooksData.filter(book => book.status === 'returned');
    } else {
        books = allBooksData.filter(book => book.status === 'issued');
    }

    // Apply semester filter first (at book level)
    if (semFilter) {
        books = books.filter(book => book.sem === semFilter);
    }

    // Group by student
    const studentsWithBooks = {};
    books.forEach(book => {
        const regNo = book.student_reg_no;
        if (!studentsWithBooks[regNo]) {
            studentsWithBooks[regNo] = {
                ...book.students,
                books: []
            };
        }
        studentsWithBooks[regNo].books.push(book);
    });

    let filtered = Object.values(studentsWithBooks);

    // Apply year and course filters (at student level)
    if (yearFilter) {
        filtered = filtered.filter(s => s.year === yearFilter);
    }

    if (courseFilter) {
        filtered = filtered.filter(s => s.course === courseFilter);
    }

    displayBooksList(filtered);
}

// Clear All Filters
function clearFilters() {
    // Reset all filter dropdowns
    document.getElementById('booksYearFilter').value = '';
    document.getElementById('booksCourseFilter').value = '';
    document.getElementById('booksSemFilter').value = '';

    // Reload the current books list without filters
    showBooksList(currentBooksListType);
}

// Export Books List to PDF
function exportBooksListToPDF() {
    const yearFilter = document.getElementById('booksYearFilter').value;
    const courseFilter = document.getElementById('booksCourseFilter').value;
    const semFilter = document.getElementById('booksSemFilter').value;

    // Get filtered data
    let books;
    if (currentBooksListType === 'issued') {
        books = allBooksData;
    } else if (currentBooksListType === 'returned') {
        books = allBooksData.filter(book => book.status === 'returned');
    } else {
        books = allBooksData.filter(book => book.status === 'issued');
    }

    // Apply semester filter first
    if (semFilter) {
        books = books.filter(book => book.sem === semFilter);
    }

    const studentsWithBooks = {};
    books.forEach(book => {
        const regNo = book.student_reg_no;
        if (!studentsWithBooks[regNo]) {
            studentsWithBooks[regNo] = {
                ...book.students,
                books: []
            };
        }
        studentsWithBooks[regNo].books.push(book);
    });

    let filtered = Object.values(studentsWithBooks);

    if (yearFilter) {
        filtered = filtered.filter(s => s.year === yearFilter);
    }

    if (courseFilter) {
        filtered = filtered.filter(s => s.course === courseFilter);
    }

    if (filtered.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    // Flatten the structure to show one row per book
    const bookRows = [];
    filtered.forEach(student => {
        student.books.forEach(book => {
            bookRows.push({
                studentName: student.name,
                regNo: student.reg_no,
                year: student.year,
                course: student.course,
                bookName: book.book_name,
                author: book.author,
                bookNo: book.book_no,
                sem: book.sem,
                phoneNo: book.phone_no,
                issueDate: book.issue_date,
                returnDate: book.return_date,
                status: book.status
            });
        });
    });

    const titles = {
        'issued': 'Total Issued Books Report',
        'returned': 'Total Returned Books Report',
        'pending': 'Pending Books Report'
    };

    // Create printable HTML
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${titles[currentBooksListType]}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 15px; }
                h1 { text-align: center; color: #2563eb; margin-bottom: 8px; font-size: 1.3em; }
                .metadata {
                    text-align: center;
                    margin-bottom: 5px;
                    color: #64748b;
                    font-size: 0.8em;
                }
                .info {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 12px;
                    color: #2563eb;
                    font-weight: 600;
                    flex-wrap: wrap;
                    font-size: 0.85em;
                }
                .info-item {
                    white-space: nowrap;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                    table-layout: fixed;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 3px 2px;
                    text-align: left;
                    font-size: 0.65em;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                th {
                    background-color: #2563eb;
                    color: white;
                    font-weight: 600;
                    font-size: 0.6em;
                    padding: 4px 2px;
                }
                tr:nth-child(even) { background-color: #f8fafc; }

                /* S.No */
                th:nth-child(1), td:nth-child(1) { width: 3%; text-align: center; }
                /* Name */
                th:nth-child(2), td:nth-child(2) { width: 12%; }
                /* Reg No */
                th:nth-child(3), td:nth-child(3) { width: 7%; }
                /* Year */
                th:nth-child(4), td:nth-child(4) { width: 5%; text-align: center; }
                /* Course */
                th:nth-child(5), td:nth-child(5) { width: 6%; }
                /* Sem */
                th:nth-child(6), td:nth-child(6) { width: 6%; text-align: center; }
                /* Book Name */
                th:nth-child(7), td:nth-child(7) { width: 18%; }
                /* Author */
                th:nth-child(8), td:nth-child(8) { width: 12%; }
                /* Book No */
                th:nth-child(9), td:nth-child(9) { width: 7%; text-align: center; }
                /* Phone No */
                th:nth-child(10), td:nth-child(10) { width: 8%; }
                /* Issue Date */
                th:nth-child(11), td:nth-child(11) { width: 7%; text-align: center; }
                /* Return Date */
                th:nth-child(12), td:nth-child(12) { width: 7%; text-align: center; }

                @media print {
                    body { padding: 8px; }
                    h1 { font-size: 1.2em; margin-bottom: 6px; }
                    .metadata { font-size: 0.75em; }
                    .info { font-size: 0.8em; margin-bottom: 10px; }
                    th, td { padding: 2px 1px; font-size: 0.6em; }
                    th { font-size: 0.55em; }
                    @page { size: landscape; margin: 0.5cm; }
                }
            </style>
        </head>
        <body>
            <h1>📚 ${titles[currentBooksListType]}</h1>
            <div class="metadata">Generated on: ${new Date().toLocaleString()}</div>
            <div class="info">
                ${yearFilter ? `<span class="info-item">Year: ${yearFilter}</span>` : ''}
                ${(yearFilter && (courseFilter || semFilter)) ? '<span>|</span>' : ''}
                ${courseFilter ? `<span class="info-item">Course: ${courseFilter}</span>` : ''}
                ${(courseFilter && semFilter) ? '<span>|</span>' : ''}
                ${semFilter ? `<span class="info-item">Semester: ${semFilter}</span>` : ''}
                ${(yearFilter || courseFilter || semFilter) ? '<span>|</span>' : ''}
                <span class="info-item">Total Books: ${bookRows.length}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Name</th>
                        <th>Reg No</th>
                        <th>Year</th>
                        <th>Course</th>
                        <th>Sem</th>
                        <th>Book Name</th>
                        <th>Author</th>
                        <th>Book No</th>
                        <th>Phone No</th>
                        <th>Issue Date</th>
                        ${currentBooksListType === 'returned' || currentBooksListType === 'issued' ? '<th>Return Date</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${bookRows.map((row, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(row.studentName)}</td>
                            <td>${escapeHtml(row.regNo)}</td>
                            <td>${escapeHtml(row.year)}</td>
                            <td>${escapeHtml(row.course)}</td>
                            <td>${row.sem || '-'}</td>
                            <td>${escapeHtml(row.bookName)}</td>
                            <td>${escapeHtml(row.author)}</td>
                            <td>${escapeHtml(row.bookNo)}</td>
                            <td>${row.phoneNo || '-'}</td>
                            <td>${formatDate(row.issueDate)}</td>
                            ${currentBooksListType === 'returned' || currentBooksListType === 'issued' ? `<td>${row.returnDate ? formatDate(row.returnDate) : '-'}</td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Search Students
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        showToast('Please enter a search term', 'warning');
        return;
    }

    showLoading(true);

    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,father.ilike.%${searchTerm}%,reg_no.ilike.%${searchTerm}%`)
            .order('name')
            .limit(10);

        if (error) throw error;

        displayResults(data);

        if (data.length === 0) {
            showToast('No students found', 'warning');
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed: ' + error.message, 'error');
        displayResults([]);
    } finally {
        showLoading(false);
    }
}

// Display Search Results
async function displayResults(students) {
    const resultsContainer = document.getElementById('resultsContainer');

    if (students.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <p>No students found. Try a different search term.</p>
            </div>
        `;
        return;
    }

    // Fetch book statistics for all students
    const studentsWithStats = await Promise.all(students.map(async (student) => {
        const stats = await getBookStatistics(student.reg_no);
        return { ...student, ...stats };
    }));

    const listHtml = `
        <div class="student-list">
            ${studentsWithStats.map(student => `
                <div class="student-item">
                    <div class="student-item-content">
                        <div class="student-info-section">
                            <div class="student-name">${escapeHtml(student.name)}</div>
                            <div class="student-details">
                                <span><strong>Reg No:</strong> ${escapeHtml(student.reg_no)}</span>
                                <span><strong>Father:</strong> ${escapeHtml(student.father)}</span>
                                <span><strong>Year:</strong> ${escapeHtml(student.year)}</span>
                                <span><strong>Course:</strong> ${escapeHtml(student.course)}</span>
                            </div>
                            <div class="book-stats">
                                <span class="stat-badge stat-issued">📚 Issued: ${student.issued || 0}</span>
                                <span class="stat-badge stat-returned">✅ Returned: ${student.returned || 0}</span>
                                <span class="stat-badge stat-pending">⏳ Pending: ${student.pending || 0}</span>
                            </div>
                        </div>
                        <div class="student-actions">
                            <button class="btn btn-issue" onclick="openIssueModalForStudent('${escapeHtml(student.reg_no)}')">📖 Issue Books</button>
                            <button class="btn btn-return" onclick="openReturnModalForStudent('${escapeHtml(student.reg_no)}')">🔄 Return Books</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    resultsContainer.innerHTML = listHtml;
}

// Get Book Statistics for a Student
async function getBookStatistics(regNo) {
    try {
        const { data, error } = await supabase
            .from('book_issues')
            .select('status')
            .eq('student_reg_no', regNo);

        if (error) throw error;

        const totalIssued = data.length; // Total books ever issued (issued + returned)
        const returned = data.filter(book => book.status === 'returned').length;
        const pending = data.filter(book => book.status === 'issued').length; // Currently pending books

        return { issued: totalIssued, returned, pending };
    } catch (error) {
        console.error('Error fetching book statistics:', error);
        return { issued: 0, returned: 0, pending: 0 };
    }
}

// Open Issue Modal for Student (called from button)
window.openIssueModalForStudent = async function(regNo) {
    // Find student data
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('reg_no', regNo)
        .single();

    if (error || !data) {
        showToast('Error loading student data', 'error');
        return;
    }

    selectedStudent = data;
    openIssueModal();
}

// Open Return Modal for Student (called from button)
window.openReturnModalForStudent = async function(regNo) {
    // Find student data
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('reg_no', regNo)
        .single();

    if (error || !data) {
        showToast('Error loading student data', 'error');
        return;
    }

    selectedStudent = data;
    openReturnModal();
}

// Open Issue Books Modal
async function openIssueModal() {
    if (!selectedStudent) return;

    try {
        // Fetch ALL data FIRST (before showing modal)
        const { data: allBooks, error: allBooksError } = await supabase
            .from('book_issues')
            .select('*')
            .eq('student_reg_no', selectedStudent.reg_no)
            .order('issue_date', { ascending: false });

        if (allBooksError) throw allBooksError;

        // Get count of currently issued books (not returned)
        const issuedBooks = allBooks ? allBooks.filter(book => book.status === 'issued') : [];
        bookEntryCount = issuedBooks.length;

        // Set student info
        document.getElementById('issueStudentName').textContent = selectedStudent.name;
        document.getElementById('issueStudentRegNo').textContent = selectedStudent.reg_no;
        document.getElementById('issueStudentCourse').textContent = selectedStudent.course;
        document.getElementById('issueStudentYear').textContent = selectedStudent.year;

        // Clear and prepare books container
        const booksContainer = document.getElementById('booksContainer');
        booksContainer.innerHTML = '';

        // Add first book entry
        addBookEntry();

        // Set up previously issued section based on data
        const previouslyIssuedSection = document.getElementById('previouslyIssuedSection');
        const previouslyIssuedContainer = document.getElementById('previouslyIssuedBooks');

        if (allBooks && allBooks.length > 0) {
            // Student has book history - show the section
            previouslyIssuedSection.style.display = 'block';

            const booksHtml = allBooks.map((book) => {
                const statusBadge = book.status === 'issued'
                    ? '<span class="status-badge status-issued">⏳ Pending</span>'
                    : '<span class="status-badge status-returned">✅ Returned</span>';

                const returnInfo = book.status === 'returned' && book.return_date
                    ? ` • Returned: ${formatDate(book.return_date)}`
                    : '';

                // Add Edit button only for issued books
                const actionButtons = book.status === 'issued' ? `
                    <div class="book-action-buttons">
                        <button class="btn-book-edit" onclick="editIssuedBook('${book.id}')" title="Edit">✏️ Edit</button>
                    </div>
                ` : '';

                return `
                    <div class="previously-issued-item ${book.status}" id="book-${book.id}">
                        <div class="book-info-inline">
                            ${statusBadge}
                            <strong class="book-display-name">${escapeHtml(book.book_name)}</strong>
                            <span class="book-author-meta">by <span class="book-display-author">${escapeHtml(book.author)}</span></span>
                            <span class="book-meta">Book #<span class="book-display-no">${escapeHtml(book.book_no)}</span> • Issued: <span class="book-display-date">${formatDate(book.issue_date)}</span>${returnInfo}</span>
                            ${book.sem ? `<span class="book-meta">• Sem: ${escapeHtml(book.sem)}</span>` : ''}
                            ${book.phone_no ? `<span class="book-meta">• Phone: ${escapeHtml(book.phone_no)}</span>` : ''}
                        </div>
                        ${actionButtons}
                    </div>
                `;
            }).join('');

            previouslyIssuedContainer.innerHTML = booksHtml;
        } else {
            // No book history - hide the section
            previouslyIssuedSection.style.display = 'none';
        }

        // NOW show modal with everything ready
        showModal('issueModal');

    } catch (error) {
        console.error('Error opening issue modal:', error);

        // Set up modal even on error
        document.getElementById('issueStudentName').textContent = selectedStudent.name;
        document.getElementById('issueStudentRegNo').textContent = selectedStudent.reg_no;
        document.getElementById('issueStudentCourse').textContent = selectedStudent.course;
        document.getElementById('issueStudentYear').textContent = selectedStudent.year;

        bookEntryCount = 0;
        const booksContainer = document.getElementById('booksContainer');
        booksContainer.innerHTML = '';
        addBookEntry();

        document.getElementById('previouslyIssuedSection').style.display = 'none';

        showModal('issueModal');
        showToast('Error loading book history', 'warning');
    }
}

// Load Previously Issued Books for Issue Modal
async function loadPreviouslyIssuedBooks() {
    const section = document.getElementById('previouslyIssuedSection');
    const container = document.getElementById('previouslyIssuedBooks');

    try {
        // Fetch ALL books (issued + returned) for complete history
        const { data, error } = await supabase
            .from('book_issues')
            .select('*')
            .eq('student_reg_no', selectedStudent.reg_no)
            .order('issue_date', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const booksHtml = data.map((book, index) => {
            const statusBadge = book.status === 'issued'
                ? '<span class="status-badge status-issued">⏳ Pending</span>'
                : '<span class="status-badge status-returned">✅ Returned</span>';

            const returnInfo = book.status === 'returned' && book.return_date
                ? ` • Returned: ${formatDate(book.return_date)}`
                : '';

            // Add Edit button only for issued books
            const actionButtons = book.status === 'issued' ? `
                <div class="book-action-buttons">
                    <button class="btn-book-edit" onclick="editIssuedBook('${book.id}')" title="Edit">✏️ Edit</button>
                </div>
            ` : '';

            return `
                <div class="previously-issued-item ${book.status}" id="book-${book.id}">
                    <div class="book-info-inline">
                        ${statusBadge}
                        <strong class="book-display-name">${escapeHtml(book.book_name)}</strong>
                        <span class="book-author-meta">by <span class="book-display-author">${escapeHtml(book.author)}</span></span>
                        <span class="book-meta">Book #<span class="book-display-no">${escapeHtml(book.book_no)}</span> • Issued: <span class="book-display-date">${formatDate(book.issue_date)}</span>${returnInfo}</span>
                        ${book.sem ? `<span class="book-meta">• Sem: ${escapeHtml(book.sem)}</span>` : ''}
                        ${book.phone_no ? `<span class="book-meta">• Phone: ${escapeHtml(book.phone_no)}</span>` : ''}
                    </div>
                    ${actionButtons}
                </div>
            `;
        }).join('');

        container.innerHTML = booksHtml;
    } catch (error) {
        console.error('Load previously issued books error:', error);
        section.style.display = 'none';
    }
}

// Edit Issued Book
window.editIssuedBook = async function(bookId) {
    try {
        // Fetch the book details
        const { data: book, error } = await supabase
            .from('book_issues')
            .select('*')
            .eq('id', bookId)
            .single();

        if (error) throw error;

        const bookElement = document.getElementById(`book-${bookId}`);
        if (!bookElement) return;

        // Get semester options based on student year
        const semesterOptions = getSemesterOptions(selectedStudent.year);
        const semesterOptionsHtml = semesterOptions
            .map(sem => `<option value="${sem}" ${sem === book.sem ? 'selected' : ''}>${sem}</option>`)
            .join('');

        // Replace the display with editable inputs
        bookElement.innerHTML = `
            <div class="book-info-inline">
                <span class="status-badge status-issued">⏳ Editing...</span>
                <div class="edit-book-form">
                    <input type="text" class="edit-book-name" value="${escapeHtml(book.book_name)}" placeholder="Book name" />
                    <input type="text" class="edit-book-author" value="${escapeHtml(book.author)}" placeholder="Author" />
                    <input type="text" class="edit-book-no" value="${escapeHtml(book.book_no)}" placeholder="Book no" />
                    <select class="edit-book-sem">
                        <option value="">Select Sem</option>
                        ${semesterOptionsHtml}
                    </select>
                    <input type="text" class="edit-book-phone" value="${book.phone_no || ''}" placeholder="Phone no" />
                    <input type="date" class="edit-book-date" value="${book.issue_date}" />
                    <div class="edit-book-actions">
                        <button class="btn-book-save" onclick="saveIssuedBook('${bookId}')">💾 Save</button>
                        <button class="btn-book-cancel" onclick="cancelEditBook()">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add uppercase conversion for book name and author
        const nameInput = bookElement.querySelector('.edit-book-name');
        const authorInput = bookElement.querySelector('.edit-book-author');

        nameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        authorInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

    } catch (error) {
        console.error('Edit book error:', error);
        showToast('Failed to load book for editing', 'error');
    }
};

// Cancel Edit Book
window.cancelEditBook = async function() {
    await loadPreviouslyIssuedBooks();
};

// Save Edited Book
window.saveIssuedBook = async function(bookId) {
    try {
        const bookElement = document.getElementById(`book-${bookId}`);
        if (!bookElement) return;

        const bookName = bookElement.querySelector('.edit-book-name').value.trim();
        const author = bookElement.querySelector('.edit-book-author').value.trim();
        const bookNo = bookElement.querySelector('.edit-book-no').value.trim();
        const sem = bookElement.querySelector('.edit-book-sem').value;
        const phoneNo = bookElement.querySelector('.edit-book-phone').value.trim();
        const issueDate = bookElement.querySelector('.edit-book-date').value;

        if (!bookName || !author || !bookNo || !issueDate) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const { error } = await supabase
            .from('book_issues')
            .update({
                book_name: bookName,
                author: author,
                book_no: bookNo,
                sem: sem || null,
                phone_no: phoneNo || null,
                issue_date: issueDate
            })
            .eq('id', bookId);

        if (error) throw error;

        // Save phone number to localStorage for future use
        if (phoneNo && selectedStudent) {
            savePhoneNumber(selectedStudent.reg_no, phoneNo);
        }

        showToast('Book updated successfully', 'success');
        await loadPreviouslyIssuedBooks();

        // Refresh dashboard to update counts
        await loadDashboard();
    } catch (error) {
        console.error('Save book error:', error);
        showToast('Failed to update book: ' + error.message, 'error');
    }
};

// Remove Issued Book
window.removeIssuedBook = async function(bookId) {
    const confirmed = confirm('Are you sure you want to delete this book entry?\n\nThis action cannot be undone.');

    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('book_issues')
            .delete()
            .eq('id', bookId);

        if (error) throw error;

        showToast('Book entry deleted successfully', 'success');
        await loadPreviouslyIssuedBooks();

        // Refresh dashboard to update counts
        await loadDashboard();

        // Refresh search results if there are any
        await refreshSearchResults();
    } catch (error) {
        console.error('Remove book error:', error);
        showToast('Failed to delete book: ' + error.message, 'error');
    }
};

// Get Semester Options Based on Year
function getSemesterOptions(year) {
    const yearNum = year?.toLowerCase();

    if (yearNum?.includes('1st') || yearNum?.includes('i')) {
        return ['1st Sem', '2nd Sem'];
    } else if (yearNum?.includes('2nd') || yearNum?.includes('ii')) {
        return ['3rd Sem', '4th Sem'];
    } else if (yearNum?.includes('3rd') || yearNum?.includes('iii')) {
        return ['5th Sem', '6th Sem'];
    }

    // Default: return all semesters
    return ['1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem'];
}

// Get Saved Phone Number for Student
function getSavedPhoneNumber(regNo) {
    try {
        const savedPhones = JSON.parse(localStorage.getItem('studentPhoneNumbers') || '{}');
        return savedPhones[regNo] || '';
    } catch (error) {
        console.error('Error retrieving saved phone number:', error);
        return '';
    }
}

// Save Phone Number for Student
function savePhoneNumber(regNo, phoneNo) {
    try {
        const savedPhones = JSON.parse(localStorage.getItem('studentPhoneNumbers') || '{}');
        if (phoneNo && phoneNo.trim()) {
            savedPhones[regNo] = phoneNo.trim();
            localStorage.setItem('studentPhoneNumbers', JSON.stringify(savedPhones));
        }
    } catch (error) {
        console.error('Error saving phone number:', error);
    }
}

// Add Book Entry (Table Row)
function addBookEntry() {
    bookEntryCount++;
    const container = document.getElementById('booksContainer');
    const currentEntries = container.querySelectorAll('tr').length;

    // Serial number based on currently issued books
    const slNo = bookEntryCount;

    // Get semester options based on student year
    const semesterOptions = getSemesterOptions(selectedStudent.year);
    const semesterOptionsHtml = semesterOptions
        .map(sem => `<option value="${sem}">${sem}</option>`)
        .join('');

    // Get saved phone number for this student
    const savedPhone = getSavedPhoneNumber(selectedStudent.reg_no);

    const bookRow = document.createElement('tr');
    bookRow.dataset.bookId = bookEntryCount;

    bookRow.innerHTML = `
        <td><input type="text" class="book-sl-no" value="${slNo}" readonly></td>
        <td><input type="text" class="book-student-name" value="${selectedStudent.name}" readonly></td>
        <td>
            <select class="book-sem">
                <option value="">Select</option>
                ${semesterOptionsHtml}
            </select>
        </td>
        <td><input type="text" class="book-year" value="${selectedStudent.year}" readonly></td>
        <td><input type="text" class="book-course" value="${selectedStudent.course}" readonly></td>
        <td><input type="text" class="book-name" required placeholder="Book name"></td>
        <td><input type="text" class="book-author" required placeholder="Author"></td>
        <td><input type="text" class="book-no" required placeholder="Book no"></td>
        <td><input type="text" class="book-phone" value="${savedPhone}" placeholder="Phone no"></td>
        <td><input type="date" class="book-date" value="${getCurrentDate()}" required></td>
        <td>
            <button type="button" class="book-row-remove-btn" onclick="removeBookEntry(this)" ${currentEntries === 0 ? 'disabled' : ''}>
                Remove
            </button>
        </td>
    `;

    container.appendChild(bookRow);

    // Add uppercase conversion for book name and author
    const bookNameInput = bookRow.querySelector('.book-name');
    const authorInput = bookRow.querySelector('.book-author');
    const phoneInput = bookRow.querySelector('.book-phone');

    bookNameInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    authorInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Save phone number on blur
    phoneInput.addEventListener('blur', (e) => {
        const phoneNo = e.target.value.trim();
        if (phoneNo) {
            savePhoneNumber(selectedStudent.reg_no, phoneNo);
        }
    });
}

// Remove Book Entry
window.removeBookEntry = function(btn) {
    const row = btn.closest('tr');
    row.remove();

    // Enable/disable remove buttons based on row count
    const container = document.getElementById('booksContainer');
    const rows = container.querySelectorAll('tr');
    if (rows.length === 1) {
        rows[0].querySelector('.book-row-remove-btn').disabled = true;
    }
}

// Get Current Date (YYYY-MM-DD)
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Submit Issue Books
async function submitIssueBooks() {
    if (!selectedStudent) return;

    const bookRows = document.querySelectorAll('#booksContainer tr');
    const books = [];
    let hasErrors = false;

    // Validate and collect book data
    bookRows.forEach(row => {
        const bookName = row.querySelector('.book-name').value.trim();
        const author = row.querySelector('.book-author').value.trim();
        const bookNo = row.querySelector('.book-no').value.trim();
        const issueDate = row.querySelector('.book-date').value;
        const sem = row.querySelector('.book-sem').value;
        const phoneNo = row.querySelector('.book-phone').value.trim();

        // Clear previous errors
        row.querySelectorAll('input').forEach(input => input.classList.remove('error'));

        // Validate required fields
        if (!bookName || !author || !bookNo || !issueDate) {
            hasErrors = true;
            if (!bookName) row.querySelector('.book-name').classList.add('error');
            if (!author) row.querySelector('.book-author').classList.add('error');
            if (!bookNo) row.querySelector('.book-no').classList.add('error');
            if (!issueDate) row.querySelector('.book-date').classList.add('error');
        } else {
            // Save phone number to localStorage if provided
            if (phoneNo) {
                savePhoneNumber(selectedStudent.reg_no, phoneNo);
            }

            books.push({
                student_reg_no: selectedStudent.reg_no,
                student_course: selectedStudent.course,
                book_name: bookName,
                author: author,
                book_no: bookNo,
                sem: sem || null,
                phone_no: phoneNo || null,
                issue_date: issueDate,
                status: 'issued'
            });
        }
    });

    if (hasErrors) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (books.length === 0) {
        showToast('Please add at least one book', 'warning');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('book_issues')
            .insert(books);

        if (error) throw error;

        showToast(`Successfully issued ${books.length} book(s) to ${selectedStudent.name}`, 'success');
        closeModal('issueModal');

        // Refresh dashboard
        await loadDashboard();

        // Refresh search results if there are any
        await refreshSearchResults();
    } catch (error) {
        console.error('Issue books error:', error);
        showToast('Failed to issue books: ' + error.message, 'error');
    }
}

// Open Return Books Modal
async function openReturnModal() {
    if (!selectedStudent) return;

    // Fetch books data FIRST (before showing modal)
    const container = document.getElementById('issuedBooksContainer');

    try {
        const { data, error } = await supabase
            .from('book_issues')
            .select('*')
            .eq('student_reg_no', selectedStudent.reg_no)
            .eq('status', 'issued')
            .order('issue_date', { ascending: false });

        if (error) throw error;

        // Set student info
        document.getElementById('returnStudentName').textContent = selectedStudent.name;
        document.getElementById('returnStudentRegNo').textContent = selectedStudent.reg_no;

        // Prepare the content based on data
        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-issued-books">
                    <p>📚 No issued books found</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">This student has no books currently issued.</p>
                </div>
            `;
            document.getElementById('submitReturnBtn').disabled = true;
        } else {
            const booksHtml = data.map(book => `
                <div class="issued-book-item">
                    <div class="book-checkbox">
                        <input type="checkbox" data-book-id="${book.id}" class="book-return-checkbox">
                    </div>
                    <div class="book-info">
                        <div class="book-title">${escapeHtml(book.book_name)}</div>
                        <div class="book-details">
                            <div><strong>Author:</strong> ${escapeHtml(book.author)}</div>
                            <div><strong>Book No:</strong> ${escapeHtml(book.book_no)}</div>
                            <div><strong>Issue Date:</strong> ${formatDate(book.issue_date)}</div>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = booksHtml;
            document.getElementById('submitReturnBtn').disabled = false;
        }

        // NOW show modal with all content ready
        showModal('returnModal');

    } catch (error) {
        console.error('Load issued books error:', error);

        // Set student info even on error
        document.getElementById('returnStudentName').textContent = selectedStudent.name;
        document.getElementById('returnStudentRegNo').textContent = selectedStudent.reg_no;

        container.innerHTML = `
            <div class="empty-issued-books">
                <p>❌ Error loading books</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
            </div>
        `;
        document.getElementById('submitReturnBtn').disabled = true;

        // Show modal even with error
        showModal('returnModal');
    }
}

// Load Issued Books (used for refreshing after return)
async function loadIssuedBooks() {
    const container = document.getElementById('issuedBooksContainer');

    try {
        const { data, error } = await supabase
            .from('book_issues')
            .select('*')
            .eq('student_reg_no', selectedStudent.reg_no)
            .eq('status', 'issued')
            .order('issue_date', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="empty-issued-books">
                    <p>📚 No issued books found</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">This student has no books currently issued.</p>
                </div>
            `;
            document.getElementById('submitReturnBtn').disabled = true;
            return;
        }

        document.getElementById('submitReturnBtn').disabled = false;

        const booksHtml = data.map(book => `
            <div class="issued-book-item">
                <div class="book-checkbox">
                    <input type="checkbox" data-book-id="${book.id}" class="book-return-checkbox">
                </div>
                <div class="book-info">
                    <div class="book-title">${escapeHtml(book.book_name)}</div>
                    <div class="book-details">
                        <div><strong>Author:</strong> ${escapeHtml(book.author)}</div>
                        <div><strong>Book No:</strong> ${escapeHtml(book.book_no)}</div>
                        <div><strong>Issue Date:</strong> ${formatDate(book.issue_date)}</div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = booksHtml;
    } catch (error) {
        console.error('Load issued books error:', error);
        container.innerHTML = `
            <div class="empty-issued-books">
                <p>❌ Error loading books</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</p>
            </div>
        `;
        document.getElementById('submitReturnBtn').disabled = true;
    }
}

// Submit Return Books
async function submitReturnBooks() {
    const checkboxes = document.querySelectorAll('.book-return-checkbox:checked');

    if (checkboxes.length === 0) {
        showToast('Please select at least one book to return', 'warning');
        return;
    }

    const bookIds = Array.from(checkboxes).map(cb => cb.dataset.bookId);
    const returnDate = getCurrentDate();

    try {
        const { data, error } = await supabase
            .from('book_issues')
            .update({
                return_date: returnDate,
                status: 'returned'
            })
            .in('id', bookIds);

        if (error) throw error;

        showToast(`Successfully returned ${bookIds.length} book(s)`, 'success');

        // Reload issued books
        await loadIssuedBooks();

        // Refresh dashboard
        await loadDashboard();

        // Refresh search results if there are any
        await refreshSearchResults();

        // If no more books, close modal
        const remainingBooks = document.querySelectorAll('.book-return-checkbox');
        if (remainingBooks.length === 0) {
            setTimeout(() => closeModal('returnModal'), 1500);
        }
    } catch (error) {
        console.error('Return books error:', error);
        showToast('Failed to return books: ' + error.message, 'error');
    }
}

// Refresh Search Results or Dashboard List (to update counts after issue/return)
async function refreshSearchResults() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();

    // If there's a search term, refresh search results
    if (searchTerm) {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,father.ilike.%${searchTerm}%,reg_no.ilike.%${searchTerm}%`)
                .order('name')
                .limit(10);

            if (error) throw error;

            // Re-display results with updated counts
            await displayResults(data);
        } catch (error) {
            console.error('Refresh search error:', error);
        }
    } else {
        // No search term, refresh dashboard students list
        await loadDashboardStudentsList();
    }
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Show/Hide Loading
function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    indicator.style.display = show ? 'flex' : 'none';
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
