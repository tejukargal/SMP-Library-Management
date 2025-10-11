// Library Management System - Main Application
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Application State
let supabase = null;
let selectedStudent = null;
let bookEntryCount = 0;

// Initialize Application
async function init() {
    try {
        // Load configuration
        const config = await loadConfig();

        // Initialize Supabase
        supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Setup event listeners
        setupEventListeners();

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize application. Check config.json', 'error');
    }
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

    // Context menu
    document.addEventListener('click', hideContextMenu);
    document.getElementById('menuIssueBooks').addEventListener('click', openIssueModal);
    document.getElementById('menuReturnBooks').addEventListener('click', openReturnModal);
    document.getElementById('menuClose').addEventListener('click', hideContextMenu);

    // Issue Modal
    document.getElementById('addBookBtn').addEventListener('click', addBookEntry);
    document.getElementById('submitIssueBtn').addEventListener('click', submitIssueBooks);
    document.getElementById('cancelIssueBtn').addEventListener('click', () => closeModal('issueModal'));

    // Return Modal
    document.getElementById('submitReturnBtn').addEventListener('click', submitReturnBooks);
    document.getElementById('cancelReturnBtn').addEventListener('click', () => closeModal('returnModal'));

    // Close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            closeModal(modalId);
        });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
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
function displayResults(students) {
    const resultsContainer = document.getElementById('resultsContainer');

    if (students.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <p>No students found. Try a different search term.</p>
            </div>
        `;
        return;
    }

    const listHtml = `
        <div class="student-list">
            ${students.map(student => `
                <div class="student-item" data-student='${JSON.stringify(student)}'>
                    <div class="student-name">${escapeHtml(student.name)}</div>
                    <div class="student-details">
                        <span><strong>Reg No:</strong> ${escapeHtml(student.reg_no)}</span>
                        <span><strong>Father:</strong> ${escapeHtml(student.father)}</span>
                        <span><strong>Year:</strong> ${escapeHtml(student.year)}</span>
                        <span><strong>Course:</strong> ${escapeHtml(student.course)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    resultsContainer.innerHTML = listHtml;

    // Add right-click listeners
    document.querySelectorAll('.student-item').forEach(item => {
        item.addEventListener('contextmenu', showContextMenu);
    });
}

// Show Context Menu
function showContextMenu(e) {
    e.preventDefault();

    const studentData = e.currentTarget.dataset.student;
    selectedStudent = JSON.parse(studentData);

    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';

    // Get menu dimensions
    const menuWidth = contextMenu.offsetWidth || 200;
    const menuHeight = contextMenu.offsetHeight || 150;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position
    let left = e.pageX;
    let top = e.pageY;

    // Adjust if menu would go off right edge
    if (left + menuWidth > viewportWidth + window.scrollX) {
        left = viewportWidth + window.scrollX - menuWidth - 10;
    }

    // Adjust if menu would go off bottom edge
    if (top + menuHeight > viewportHeight + window.scrollY) {
        top = viewportHeight + window.scrollY - menuHeight - 10;
    }

    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
}

// Hide Context Menu
function hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
}

// Open Issue Books Modal
async function openIssueModal() {
    hideContextMenu();

    if (!selectedStudent) return;

    // Set student info
    document.getElementById('issueStudentName').textContent = selectedStudent.name;
    document.getElementById('issueStudentRegNo').textContent = selectedStudent.reg_no;
    document.getElementById('issueStudentCourse').textContent = selectedStudent.course;
    document.getElementById('issueStudentYear').textContent = selectedStudent.year;

    // Reset books container
    bookEntryCount = 0;
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

        const booksHtml = data.map(book => `
            <div class="previously-issued-item">
                <div class="book-info-inline">
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

    const bookEntry = document.createElement('div');
    bookEntry.className = 'book-entry';
    bookEntry.dataset.bookId = bookEntryCount;

    bookEntry.innerHTML = `
        <div class="book-entry-header">
            <span class="book-entry-title">Book ${bookEntryCount}</span>
            ${bookEntryCount > 1 ? '<button class="remove-book-btn" onclick="removeBookEntry(this)">Remove</button>' : ''}
        </div>
        <div class="form-grid">
            <div class="form-group full-width">
                <label>Book Name *</label>
                <input type="text" class="book-name" required>
            </div>
            <div class="form-group">
                <label>Author *</label>
                <input type="text" class="book-author" required>
            </div>
            <div class="form-group">
                <label>Book Number *</label>
                <input type="text" class="book-no" required>
            </div>
            <div class="form-group full-width">
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
    } catch (error) {
        console.error('Issue books error:', error);
        showToast('Failed to issue books: ' + error.message, 'error');
    }
}

// Open Return Books Modal
async function openReturnModal() {
    hideContextMenu();

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
