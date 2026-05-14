// PASTE YOUR ACTUAL APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWvJYEEx-fIt8_W78w8SWNC2g5z5EOVE8GodxXBJ5UlGtBRSfwwDigVLO1OwAbs03mOw/exec";

// Modal Controls Elements
const openLoginBtn = document.getElementById('openLoginBtn');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const loginModal = document.getElementById('loginModal');

// Tab Toggle Selection Elements
const tabStudent = document.getElementById('tabStudent');
const tabStaff = document.getElementById('tabStaff');

// Form Formats Elements
const studentLoginForm = document.getElementById('studentLoginForm');
const staffLoginForm = document.getElementById('staffLoginForm');

// Error Messaging Hook Targets
const studentErrorMsg = document.getElementById('studentErrorMsg');
const staffErrorMsg = document.getElementById('staffErrorMsg');

// Modal Toggles Controllers
openLoginBtn.addEventListener('click', () => loginModal.classList.add('active'));
closeLoginBtn.addEventListener('click', () => {
    loginModal.classList.remove('active');
    resetPortalForms();
});

// Clean slate form system resetting utility
function resetPortalForms() {
    studentLoginForm.reset();
    staffLoginForm.reset();
    studentErrorMsg.style.display = 'none';
    staffErrorMsg.style.display = 'none';
}

// --- INTERACTIVE SYSTEM SWITCH TABS ---
tabStudent.addEventListener('click', () => switchPortalMode('student'));
tabStaff.addEventListener('click', () => switchPortalMode('staff'));

function switchPortalMode(targetMode) {
    // Hide active warning indicators on shift transition
    studentErrorMsg.style.display = 'none';
    staffErrorMsg.style.display = 'none';

    if (targetMode === 'student') {
        tabStudent.classList.add('active');
        tabStaff.classList.remove('active');
        studentLoginForm.classList.add('active');
        staffLoginForm.classList.remove('active');
    } else {
        tabStaff.classList.add('active');
        tabStudent.classList.remove('active');
        staffLoginForm.classList.add('active');
        studentLoginForm.classList.remove('active');
    }
}

// =======================================================
// SUBMISSION LISTENER 1: STUDENT CLOUD ROUTER
// =======================================================
studentLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    studentErrorMsg.style.display = 'none';
    
    const submitBtn = document.getElementById('studentSubmitBtn');
    const idValue = document.getElementById('studentId').value.trim();
    const passValue = document.getElementById('studentPassword').value.trim();

    submitBtn.innerText = "Verifying Credentials...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=login`, {
            method: 'POST',
            body: JSON.stringify({ id: idValue, password: passValue })
        });
        const result = await response.json();

        if (result.status === "success") {
            // Save profile details to session mapping layer
            sessionStorage.setItem("studentProfile", JSON.stringify(result.data));
            window.location.href = 'dashboard.html';
        } else {
            studentErrorMsg.innerText = result.message || "Invalid Student ID or Password.";
            studentErrorMsg.style.display = 'block';
        }
    } catch (err) {
        studentErrorMsg.innerText = "Database connection error. Check network state.";
        studentErrorMsg.style.display = 'block';
    } finally {
        submitBtn.innerText = "Login to Dashboard";
        submitBtn.disabled = false;
    }
});

// =======================================================
// SUBMISSION LISTENER 2: LOCAL HARDCODED STAFF ROUTER
// =======================================================
staffLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    staffErrorMsg.style.display = 'none';
    
    const userValue = document.getElementById('username').value.trim();
    const passValue = document.getElementById('password').value.trim();

    // Front-end immediate conditional authenticator gate
    if (userValue === 'VRA_STAFF' && passValue === 'SecureStaff2026!') {
        sessionStorage.setItem('staffLoggedIn', 'true');
        window.location.href = 'teacher-panel.html';
    } else {
        staffErrorMsg.innerText = "Invalid Staff Credentials. Access Denied.";
        staffErrorMsg.style.display = 'block';
    }
});
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
async function executeDeletion(sheetName, rowNum, context) {
    // Stage 1: Browser Confirmation (Safety Gate)
    if (!confirm(`Are you sure you want to permanently delete this ${context}? This action cannot be undone.`)) {
        showToast("Deletion cancelled.", "error"); // Optional: let them know it was aborted
        return;
    }

    try {
        // Stage 2: Triggering the Apps Script Deletion
        const response = await fetch(`${SCRIPT_URL}?action=deleteRow`, { 
            method: 'POST', 
            body: JSON.stringify({ sheetName: sheetName, rowNum: rowNum }) 
        });
        const result = await response.json();

        if (result.status === "success") {
            // Stage 3: Success Notification
            showToast(`${context.charAt(0).toUpperCase() + context.slice(1)} deleted from database.`, "success");
            
            // Stage 4: Refresh the specific table without reloading page
            if (context === 'student') refreshStudentsTable();
            if (context === 'resource') refreshResourcesTable();
        } else {
            showToast(result.message || "Deletion failed. Check spreadsheet permissions.", "error");
        }
    } catch (err) { 
        console.error("Deletion Error:", err);
        showToast("Network error. Record was not deleted.", "error"); 
    }
}