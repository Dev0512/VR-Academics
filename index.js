const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwA9kC29oWeo6oxPX4G88BqcaOu9G_6cKzY7ms4Eo7ERtyosGg3L-kqauMKhDBVLXVA9g/exec";

// ==========================================
// 1. CORE INITIALIZATION & MODAL TOGGLES
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById('loginModal');
    const openLoginBtn = document.getElementById('openLoginBtn');
    const closeLoginBtn = document.getElementById('closeLoginBtn');

    // Open Modal
    if (openLoginBtn) {
        openLoginBtn.addEventListener('click', () => {
            loginModal.classList.add('active');
            // Default to student login view on open
            resetToStudentTab();
        });
    }

    // Close Modal
    if (closeLoginBtn) {
        closeLoginBtn.addEventListener('click', () => {
            loginModal.classList.remove('active');
        });
    }

    // Close Modal by clicking overlay shadow
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
        }
    });
});

// Universal Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 2. THREE-WAY TAB MULTIPLEXER LOGIC
// ==========================================
const tabStudent = document.getElementById('tabStudent');
const tabSignup = document.getElementById('tabSignup');
const tabStaff = document.getElementById('tabStaff');

const studentForm = document.getElementById('studentLoginForm');
const signupForm = document.getElementById('studentSignupForm');
const staffForm = document.getElementById('staffLoginForm');

const studentErrorMsg = document.getElementById('studentErrorMsg');
const staffErrorMsg = document.getElementById('staffErrorMsg');

function clearErrorMessages() {
    if (studentErrorMsg) studentErrorMsg.style.display = 'none';
    if (staffErrorMsg) staffErrorMsg.style.display = 'none';
}

// Helper function to manage layout engine visibility states
function switchActiveForm(activeTab, formToShow) {
    clearErrorMessages();
    
    // Step 1: Remove 'active' selection states from all upper buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Step 2: Remove active visibility markers from ALL forms and hide them completely
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
        form.style.display = 'none';
    });
    
    // Step 3: Assign active styling to the chosen tab element and target form wrapper
    activeTab.classList.add('active');
    formToShow.classList.add('active');
}

function resetToStudentTab() {
    switchActiveForm(tabStudent, studentForm);
}

// Clean event trigger routes that ensure only ONE layout displays at a time
tabStudent.addEventListener('click', () => {
    switchActiveForm(tabStudent, studentForm);
});

tabSignup.addEventListener('click', () => {
    switchActiveForm(tabSignup, signupForm);
});

tabStaff.addEventListener('click', () => {
    switchActiveForm(tabStaff, staffForm);
});

// ==========================================
// 3. STUDENT PORTAL LIVE AUTHENTICATION
// ==========================================
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrorMessages();
    
    const submitBtn = document.getElementById('studentSubmitBtn');
    const idVal = document.getElementById('studentId').value;
    const passVal = document.getElementById('studentPassword').value;

    submitBtn.innerText = "Verifying Credentials...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=login`, {
            method: 'POST',
            body: JSON.stringify({ id: idVal, password: passVal })
        });
        const result = await response.json();

        if (result.status === "success") {
            showToast("Login Successful! Launching profile...", "success");
            // Cache specific details about who logged in to parse their custom dashboard filters
            sessionStorage.setItem('studentName', result.data.name);
            sessionStorage.setItem('studentClass', result.data.className);
            sessionStorage.setItem('studentID', result.data.id);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            studentErrorMsg.innerText = result.message || "Invalid Student ID or Password.";
            studentErrorMsg.style.display = 'block';
            showToast("Authentication Failed.", "error");
        }
    } catch (err) {
        showToast("Server interface timeout.", "error");
    } finally {
        submitBtn.innerText = "Login to Dashboard";
        submitBtn.disabled = false;
    }
});

// ==========================================
// 4. NEW STUDENT SELF-REGISTRATION QUEUE 
// ==========================================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('signUpSubmitBtn');
    
    const payload = {
        name: document.getElementById('signUpName').value,
        class: document.getElementById('signUpClass').value,
        id: document.getElementById('signUpID').value,
        password: document.getElementById('signUpPass').value,
        phone: document.getElementById('signUpPhone').value
    };

    submitBtn.innerText = "Submitting to Roster...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=submitJoinRequest`, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const result = await response.json();

        if (result.status === "success") {
            showToast("Application logged! Awaiting staff authorization clearance.", "success");
            signupForm.reset();
            // Automatically switch back to login view so they know where to enter details later
            setTimeout(() => resetToStudentTab(), 2000);
        } else {
            showToast("Submission dropped: " + result.message, "error");
        }
    } catch (err) {
        showToast("Gateway validation timeout.", "error");
    } finally {
        submitBtn.innerText = "Submit Registration Request";
        submitBtn.disabled = false;
    }
});

// ==========================================
// 5. STAFF GATEWAY STATIC VERIFIER
// ==========================================
staffForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrorMessages();

    const userVal = document.getElementById('username').value.trim();
    const passVal = document.getElementById('password').value.trim();

    // Replace these placeholder strings with your own static team logins
    if (userVal === "admin" && passVal === "vracademics2026") {
        showToast("Access Authorized. Booting control center...", "success");
        sessionStorage.setItem('staffLoggedIn', 'true');
        
        setTimeout(() => {
            window.location.href = 'teacher-panel.html';
        }, 1000);
    } else {
        staffErrorMsg.style.display = 'block';
        showToast("Access Denied.", "error");
    }
});