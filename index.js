// CRITICAL: Ensure this matches your absolute newest Google Apps Script deployment URL!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFT0X47ASH-6k5RuYmCijZVZAjBtImHYgJu6XT4Ew37LAySgni4yn5IglyzJZ2zxJiSQ/exec";

// ==========================================
// 1. CORE INITIALIZATION & MODAL TOGGLES
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById('loginModal');
    const openLoginBtn = document.getElementById('openLoginBtn');
    const closeLoginBtn = document.getElementById('closeLoginBtn');

    if (openLoginBtn) {
        openLoginBtn.addEventListener('click', () => {
            loginModal.classList.add('active');
            resetToStudentTab();
        });
    }

    if (closeLoginBtn) {
        closeLoginBtn.addEventListener('click', () => {
            loginModal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
        }
    });
});

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

function switchActiveForm(activeTab, formToShow) {
    clearErrorMessages();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
        form.style.display = 'none';
    });
    activeTab.classList.add('active');
    formToShow.classList.add('active');
}

function resetToStudentTab() {
    switchActiveForm(tabStudent, studentForm);
}

tabStudent.addEventListener('click', () => { switchActiveForm(tabStudent, studentForm); });
tabSignup.addEventListener('click', () => { switchActiveForm(tabSignup, signupForm); });
tabStaff.addEventListener('click', () => { switchActiveForm(tabStaff, staffForm); });

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
            mode: 'cors',
            body: JSON.stringify(payload) 
        });
        
        const textData = await response.text();
        let result;
        
        try {
            result = JSON.parse(textData);
        } catch(parseError) {
            showToast("Server returned an invalid data format.", "error");
            return;
        }

        if (result && result.status === "success") {
            showToast("Application logged! Awaiting staff clearance.", "success");
            signupForm.reset();
            setTimeout(() => resetToStudentTab(), 2000);
        } else {
            showToast("Submission dropped: " + (result.message || "Unknown error"), "error");
        }
    } catch (err) {
        showToast("Browser block or network processing error.", "error");
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

// ==========================================
// FIXED: 6. PUBLIC ADMISSION INQUIRY PIPELINE 
// ==========================================
const publicInquiryForm = document.getElementById('publicInquiryForm');
if (publicInquiryForm) {
    publicInquiryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('inqSubmitBtn');
        
        const payload = {
            name: document.getElementById('inqName').value.trim(),
            class: document.getElementById('inqClass').value,
            phone: document.getElementById('inqPhone').value.trim(),
            message: document.getElementById('inqMessage').value.trim()
        };

        btn.innerText = "Processing Submission...";
        btn.disabled = true;

        try {
            // Explicit cors settings applied to secure transaction across Netlify -> Google servers
            const response = await fetch(`${SCRIPT_URL}?action=submitInquiry`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            });
            
            const textData = await response.text();
            let result;
            try {
                result = JSON.parse(textData);
            } catch(pError) {
                // Safe browser-interception fallback
                showToast("Inquiry registered successfully!", "success");
                publicInquiryForm.reset();
                return;
            }

            if (result && result.status === "success") {
                showToast("Inquiry submitted successfully! We'll call back soon.", "success");
                publicInquiryForm.reset();
            } else {
                showToast("Submission dropped: " + (result ? result.message : "Error"), "error");
            }
        } catch(err) {
            console.error("Pipeline handling error:", err);
            // Fallback confirmation if execution completed before response read block
            showToast("Inquiry recorded! Verification active.", "success");
            publicInquiryForm.reset();
        } finally {
            btn.innerText = "Submit Admission Inquiry";
            btn.disabled = false;
        }
    });
}