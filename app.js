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
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Clear data button
    document.getElementById('clearDataBtn').addEventListener('click', openClearDataModal);
    document.getElementById('cancelClearBtn').addEventListener('click', () => closeModal('clearDataModal'));
    document.getElementById('confirmClearBtn').addEventListener('click', handleClearData);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    // Convert search input to uppercase dynamically
    searchInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
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
    document.getElementById('issuedCard').addEventListener('click', () => showBooksList('issued'));
    document.getElementById('returnedCard').addEventListener('click', () => showBooksList('returned'));
    document.getElementById('pendingCard').addEventListener('click', () => showBooksList('pending'));

    // Books list modal
    document.getElementById('closeBooksListBtn').addEventListener('click', () => closeModal('booksListModal'));
    document.getElementById('booksYearFilter').addEventListener('change', filterBooksList);
    document.getElementById('booksCourseFilter').addEventListener('change', filterBooksList);
    document.getElementById('exportPdfBtn').addEventListener('click', exportBooksListToPDF);

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

        // Reload dashboard to show zero counts
        await loadDashboard();

        // Clear search results
        document.getElementById('resultsContainer').innerHTML = `
            <div class="empty-state">
                <p>🔍 Enter a search term to find students</p>
            </div>
        `;
    } catch (error) {
        console.error('Clear data error:', error);
        errorDiv.textContent = 'Failed to delete data: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

// Load Dashboard Metrics
async function loadDashboard() {
    try {
        // Get all book issues
        const { data: allBooks, error } = await supabase
            .from('book_issues')
            .select('*, students(name, reg_no, course, year)');

        if (error) throw error;

        // Store globally
        allBooksData = allBooks || [];

        // Calculate metrics - Fix: Total Issued - Total Returned = Total Pending
        const totalIssued = allBooks ? allBooks.length : 0;
        const returnedBooks = allBooks ? allBooks.filter(book => book.status === 'returned') : [];
        const issuedBooks = allBooks ? allBooks.filter(book => book.status === 'issued') : [];
        const totalReturned = returnedBooks.length;
        const totalPending = issuedBooks.length;

        document.getElementById('totalIssuedBooks').textContent = totalIssued;
        document.getElementById('totalReturnedBooks').textContent = totalReturned;
        document.getElementById('totalPendingBooks').textContent = totalPending;
    } catch (error) {
        console.error('Load dashboard error:', error);
        showToast('Error loading dashboard data', 'error');
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

    const yearFilter = document.getElementById('booksYearFilter');
    const courseFilter = document.getElementById('booksCourseFilter');

    yearFilter.innerHTML = '<option value="">All Years</option>' +
        years.map(year => `<option value="${year}">${year}</option>`).join('');
    courseFilter.innerHTML = '<option value="">All Courses</option>' +
        courses.map(course => `<option value="${course}">${course}</option>`).join('');

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

    const tableHtml = `
        <table class="students-table">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Name</th>
                    <th>Reg No</th>
                    <th>Year</th>
                    <th>Course</th>
                    <th>Books</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${students.map((student, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(student.name)}</td>
                        <td>${escapeHtml(student.reg_no)}</td>
                        <td>${escapeHtml(student.year)}</td>
                        <td>${escapeHtml(student.course)}</td>
                        <td class="books-cell">
                            ${student.books.map(book => `<span class="book-tag">${escapeHtml(book.book_name)}</span>`).join(' ')}
                        </td>
                        <td><span class="count-badge">${student.books.length}</span></td>
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

    // Get current type books
    let books;
    if (currentBooksListType === 'issued') {
        books = allBooksData;
    } else if (currentBooksListType === 'returned') {
        books = allBooksData.filter(book => book.status === 'returned');
    } else {
        books = allBooksData.filter(book => book.status === 'issued');
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

    // Apply filters
    if (yearFilter) {
        filtered = filtered.filter(s => s.year === yearFilter);
    }

    if (courseFilter) {
        filtered = filtered.filter(s => s.course === courseFilter);
    }

    displayBooksList(filtered);
}

// Export Books List to PDF
function exportBooksListToPDF() {
    const yearFilter = document.getElementById('booksYearFilter').value;
    const courseFilter = document.getElementById('booksCourseFilter').value;

    // Get filtered data
    let books;
    if (currentBooksListType === 'issued') {
        books = allBooksData;
    } else if (currentBooksListType === 'returned') {
        books = allBooksData.filter(book => book.status === 'returned');
    } else {
        books = allBooksData.filter(book => book.status === 'issued');
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
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { text-align: center; color: #2563eb; margin-bottom: 10px; }
                .metadata {
                    text-align: center;
                    margin-bottom: 5px;
                    color: #64748b;
                    font-size: 0.95em;
                }
                .info {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 20px;
                    color: #2563eb;
                    font-weight: 600;
                    flex-wrap: wrap;
                }
                .info-item {
                    white-space: nowrap;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    table-layout: fixed;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                th { background-color: #2563eb; color: white; font-size: 0.9em; }
                tr:nth-child(even) { background-color: #f8fafc; }
                td:nth-child(1) { width: 5%; }
                td:nth-child(2) { width: 20%; white-space: normal; }
                td:nth-child(3) { width: 12%; }
                td:nth-child(4) { width: 8%; }
                td:nth-child(5) { width: 12%; }
                td:nth-child(6) { width: 35%; white-space: normal; word-wrap: break-word; }
                td:nth-child(7) { width: 8%; text-align: center; }
                .book-tag {
                    display: inline-block;
                    background: #e0e7ff;
                    padding: 2px 6px;
                    margin: 2px;
                    border-radius: 3px;
                    font-size: 0.8em;
                    white-space: nowrap;
                }
                .count-badge {
                    background: #ea580c;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-weight: bold;
                }
                @media print {
                    body { padding: 10px; }
                    th, td { padding: 6px; font-size: 0.85em; }
                }
            </style>
        </head>
        <body>
            <h1>📚 ${titles[currentBooksListType]}</h1>
            <div class="metadata">Generated on: ${new Date().toLocaleString()}</div>
            <div class="info">
                ${yearFilter ? `<span class="info-item">Year: ${yearFilter}</span>` : ''}
                ${yearFilter && courseFilter ? '<span>|</span>' : ''}
                ${courseFilter ? `<span class="info-item">Course: ${courseFilter}</span>` : ''}
                ${(yearFilter || courseFilter) ? '<span>|</span>' : ''}
                <span class="info-item">Total Students: ${filtered.length}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Name</th>
                        <th>Reg No</th>
                        <th>Year</th>
                        <th>Course</th>
                        <th>Books</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((student, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(student.name)}</td>
                            <td>${escapeHtml(student.reg_no)}</td>
                            <td>${escapeHtml(student.year)}</td>
                            <td>${escapeHtml(student.course)}</td>
                            <td>
                                ${student.books.map(book => `<span class="book-tag">${escapeHtml(book.book_name)}</span>`).join(' ')}
                            </td>
                            <td><span class="count-badge">${student.books.length}</span></td>
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

        const issued = data.filter(book => book.status === 'issued').length;
        const returned = data.filter(book => book.status === 'returned').length;

        return { issued, returned };
    } catch (error) {
        console.error('Error fetching book statistics:', error);
        return { issued: 0, returned: 0 };
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

    // Set student info
    document.getElementById('issueStudentName').textContent = selectedStudent.name;
    document.getElementById('issueStudentRegNo').textContent = selectedStudent.reg_no;
    document.getElementById('issueStudentCourse').textContent = selectedStudent.course;
    document.getElementById('issueStudentYear').textContent = selectedStudent.year;

    // Get the count of currently issued books (not returned) for this student
    const { data, error } = await supabase
        .from('book_issues')
        .select('id')
        .eq('student_reg_no', selectedStudent.reg_no)
        .eq('status', 'issued');

    bookEntryCount = data ? data.length : 0;

    // Reset books container
    document.getElementById('booksContainer').innerHTML = '';

    // Load previously issued books
    await loadPreviouslyIssuedBooks();

    // Add first book entry
    addBookEntry();

    // Show modal
    showModal('issueModal');
}

// Load Previously Issued Books for Issue Modal
async function loadPreviouslyIssuedBooks() {
    const section = document.getElementById('previouslyIssuedSection');
    const container = document.getElementById('previouslyIssuedBooks');

    try {
        const { data, error } = await supabase
            .from('book_issues')
            .select('*')
            .eq('student_reg_no', selectedStudent.reg_no)
            .eq('status', 'issued')
            .order('issue_date', { ascending: false });

        if (error) throw error;

        if (data.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const booksHtml = data.map((book, index) => `
            <div class="previously-issued-item">
                <div class="book-info-inline">
                    <span class="book-sl-badge">Sl ${index + 1}</span>
                    <strong>${escapeHtml(book.book_name)}</strong> by ${escapeHtml(book.author)}
                    <span class="book-meta">Book #${escapeHtml(book.book_no)} • Issued: ${formatDate(book.issue_date)}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = booksHtml;
    } catch (error) {
        console.error('Load previously issued books error:', error);
        section.style.display = 'none';
    }
}

// Add Book Entry
function addBookEntry() {
    bookEntryCount++;
    const container = document.getElementById('booksContainer');
    const currentEntries = container.querySelectorAll('.book-entry').length;

    const bookEntry = document.createElement('div');
    bookEntry.className = 'book-entry';
    bookEntry.dataset.bookId = bookEntryCount;

    // Serial number based on currently issued books
    const slNo = bookEntryCount;

    bookEntry.innerHTML = `
        <div class="book-entry-header">
            <span class="book-entry-title">Sl No. ${slNo}</span>
            ${currentEntries > 0 ? '<button class="remove-book-btn" onclick="removeBookEntry(this)">Remove</button>' : ''}
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Sl No. *</label>
                <input type="text" class="book-sl-no" value="${slNo}" required readonly>
            </div>
            <div class="form-group">
                <label>Book Number *</label>
                <input type="text" class="book-no" required placeholder="Enter book number">
            </div>
            <div class="form-group full-width">
                <label>Book Name *</label>
                <input type="text" class="book-name" required>
            </div>
            <div class="form-group">
                <label>Author *</label>
                <input type="text" class="book-author" required>
            </div>
            <div class="form-group">
                <label>Date of Issue *</label>
                <input type="date" class="book-date" value="${getCurrentDate()}" required>
            </div>
        </div>
    `;

    container.appendChild(bookEntry);
}

// Remove Book Entry
window.removeBookEntry = function(btn) {
    btn.closest('.book-entry').remove();
}

// Get Current Date (YYYY-MM-DD)
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Submit Issue Books
async function submitIssueBooks() {
    if (!selectedStudent) return;

    const bookEntries = document.querySelectorAll('.book-entry');
    const books = [];
    let hasErrors = false;

    // Validate and collect book data
    bookEntries.forEach(entry => {
        const bookName = entry.querySelector('.book-name').value.trim();
        const author = entry.querySelector('.book-author').value.trim();
        const bookNo = entry.querySelector('.book-no').value.trim();
        const issueDate = entry.querySelector('.book-date').value;

        // Clear previous errors
        entry.querySelectorAll('input').forEach(input => input.classList.remove('error'));

        // Validate
        if (!bookName || !author || !bookNo || !issueDate) {
            hasErrors = true;
            if (!bookName) entry.querySelector('.book-name').classList.add('error');
            if (!author) entry.querySelector('.book-author').classList.add('error');
            if (!bookNo) entry.querySelector('.book-no').classList.add('error');
            if (!issueDate) entry.querySelector('.book-date').classList.add('error');
        } else {
            books.push({
                student_reg_no: selectedStudent.reg_no,
                book_name: bookName,
                author: author,
                book_no: bookNo,
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
    } catch (error) {
        console.error('Issue books error:', error);
        showToast('Failed to issue books: ' + error.message, 'error');
    }
}

// Open Return Books Modal
async function openReturnModal() {
    if (!selectedStudent) return;

    // Set student info
    document.getElementById('returnStudentName').textContent = selectedStudent.name;
    document.getElementById('returnStudentRegNo').textContent = selectedStudent.reg_no;

    // Load issued books
    await loadIssuedBooks();

    // Show modal
    showModal('returnModal');
}

// Load Issued Books
async function loadIssuedBooks() {
    const container = document.getElementById('issuedBooksContainer');
    container.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><span>Loading...</span></div>';

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
