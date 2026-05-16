const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-h4118pk_xz7Z9txxTUJjj2xV8Qo6LFb9Am7sA0X3fFzRbwMr-bqO0AWFigaprCQOMA/exec";

// ==========================================
// PART 1: CORE ORCHESTRATION & SETUP
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    refreshStudentsTable();
    refreshResourcesTable();
    refreshApprovalsTable(); 
    refreshNoticesTable();
    refreshInquiriesTable();
    refreshCalendarTable(); // NEW: Fire initial calendar dashboard sync 
    setupSubjectFilters();
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

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    element.classList.add('active');
}

function toggleSourceInput() {
    const mode = document.getElementById('sourceToggle').value;
    const uploadGroup = document.getElementById('uploadInputGroup');
    const linkGroup = document.getElementById('linkInputGroup');
    
    if (mode === 'upload') {
        uploadGroup.style.display = 'flex';
        linkGroup.style.display = 'none';
        document.getElementById('resLink').removeAttribute('required');
    } else {
        uploadGroup.style.display = 'none';
        linkGroup.style.display = 'flex';
        document.getElementById('resLink').setAttribute('required', 'true');
    }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

function setupSubjectFilters() {
    const resourceClassSelect = document.getElementById('resClass');
    const resourceSubjectSelect = document.getElementById('resSubject');

    if (resourceClassSelect && resourceSubjectSelect) {
        const originalSubjects = Array.from(resourceSubjectSelect.options).map(opt => ({
            value: opt.value,
            text: opt.text
        }));

        resourceClassSelect.addEventListener('change', () => {
            const selectedClass = resourceClassSelect.value;
            const currentSubjectValue = resourceSubjectSelect.value;

            resourceSubjectSelect.innerHTML = "";

            originalSubjects.forEach(sub => {
                const isCommerce = ["Accounts", "Economics", "B.St"].includes(sub.value);
                const isJuniorGrade = ["9th", "10th"].includes(selectedClass);

                if (isJuniorGrade && isCommerce) return; 

                const newOption = new Option(sub.text, sub.value);
                resourceSubjectSelect.add(newOption);
            });

            if (Array.from(resourceSubjectSelect.options).some(opt => opt.value === currentSubjectValue)) {
                resourceSubjectSelect.value = currentSubjectValue;
            }
        });
    }
}

// ==========================================
// PART 2: ACTIVE STUDENT MANAGEMENT CORE
// ==========================================
async function refreshStudentsTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStudentsList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("studentsTableBody");
        tbody.innerHTML = "";
        
        if (result.status === "success") {
            result.students.forEach(s => {
                tbody.innerHTML += `<tr><td>${s.name}</td><td>Class ${s.class}</td><td><code>${s.id}</code></td><td><button class="delete-row-btn" onclick="executeDeletion('Students', ${s.rowNum}, 'student')">Remove</button></td></tr>`;
            });
        }
    } catch(err) { showToast("Failed to sync active rosters.", "error"); }
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('studName').value,
        class: document.getElementById('studClass').value,
        id: document.getElementById('studID').value,
        password: document.getElementById('studPass').value,
        phone: document.getElementById('studPhone').value
    };
    try {
        const response = await fetch(`${SCRIPT_URL}?action=addStudent`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.status === "success") {
            showToast("Student profile saved directly!", "success");
            document.getElementById('studentForm').reset();
            refreshStudentsTable();
        }
    } catch (err) { showToast("Network handshake failure.", "error"); }
});

// ==========================================
// PART 3: ACADEMIC MATERIAL PUBLISHING LOGIC
// ==========================================
async function refreshResourcesTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getResourcesList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("resourcesTableBody");
        tbody.innerHTML = "";
        
        if (result.status === "success") {
            result.resources.forEach(r => {
                tbody.innerHTML += `<tr><td><strong>${r.subject}</strong></td><td>${r.topic}</td><td>Class ${r.class}</td><td><button class="delete-row-btn" onclick="executeDeletion('Resources', ${r.rowNum}, 'resource')">Delete</button></td></tr>`;
            });
        }
    } catch(err) { showToast("Failed to refresh catalog files.", "error"); }
}

document.getElementById('resourceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('uploadSubmitBtn');
    const mode = document.getElementById('sourceToggle').value;
    const fileInput = document.getElementById('resFile');
    
    const payload = {
        subject: document.getElementById('resSubject').value,
        topic: document.getElementById('resTopic').value,
        type: document.getElementById('resType').value,
        class: document.getElementById('resClass').value,
        link: ""
    };

    if (mode === 'upload') {
        if (fileInput.files.length === 0) { showToast("File attachment missing.", "error"); return; }
        submitBtn.innerText = "Encoding File Stream...";
        submitBtn.disabled = true;
        const file = fileInput.files[0];
        if (file.size > 5000000) { showToast("Stay under 5MB.", "error"); submitBtn.disabled = false; return; }
        try {
            payload.fileData = await toBase64(file);
            payload.fileMime = file.type;
        } catch (err) { showToast("Structure crash.", "error"); submitBtn.disabled = false; return; }
    } else {
        payload.link = document.getElementById('resLink').value;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=addResource`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "success") {
            showToast("Material distributed!", "success");
            document.getElementById('resourceForm').reset();
            toggleSourceInput();
            refreshResourcesTable();
        }
    } catch (err) { showToast("Gateway timeout.", "error"); }
    finally { submitBtn.innerText = "Publish to Dashboard"; submitBtn.disabled = false; }
});

// ==========================================
// PART 4: ACCOUNT SELF-REGISTRATION APPROVAL
// ==========================================
async function refreshApprovalsTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getApprovalRequests`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("approvalsTableBody");
        const badge = document.getElementById("approvalBadge");
        tbody.innerHTML = "";
        
        if (result.status === "success" && result.requests.length > 0) {
            badge.innerText = result.requests.length;
            badge.style.display = "inline-block";
            result.requests.forEach(req => {
                tbody.innerHTML += `<tr><td>${req.name}</td><td>Class ${req.class}</td><td><code>${req.id}</code></td><td><button class="submit-btn" style="padding: 6px 12px; font-size: 13px; margin-right: 5px;" onclick="processApproval(${req.rowNum}, true)">Approve Access</button><button class="delete-row-btn" style="padding: 6px 12px; font-size: 13px;" onclick="processApproval(${req.rowNum}, false)">Deny</button></td></tr>`;
            });
        } else {
            badge.style.display = "none";
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:25px;">No pending applications found.</td></tr>`;
        }
    } catch(err) { console.error("Error connecting with approvals buffer."); }
}

async function processApproval(rowNum, statusFlag) {
    const targetEndpoint = statusFlag ? 'approveStudent' : 'deleteRow';
    if (!confirm("Proceed with this action request?")) return;
    
    const processingPayload = statusFlag ? { rowNum: rowNum } : { sheetName: 'Approvals', rowNum: rowNum };
    try {
        const response = await fetch(`${SCRIPT_URL}?action=${targetEndpoint}`, { method: 'POST', body: JSON.stringify(processingPayload) });
        const result = await response.json();
        if (result.status === "success") {
            showToast("Queue altered cleanly.", "success");
            refreshApprovalsTable(); refreshStudentsTable(); 
        }
    } catch (err) { showToast("Pipeline error.", "error"); }
}

// ==========================================
// PART 5: DELETION ENGINE & ROUTING MANAGERS
// ==========================================
async function executeDeletion(sheetName, rowNum, context) {
    if (!confirm(`Are you completely certain you want to destroy this ${context} row index mapping permanently?`)) {
        showToast("Purge cancelled.", "error");
        return;
    }
    try {
        const response = await fetch(`${SCRIPT_URL}?action=deleteRow`, { method: 'POST', body: JSON.stringify({ sheetName: sheetName, rowNum: rowNum }) });
        const result = await response.json();
        if (result.status === "success") {
            showToast(`${context.charAt(0).toUpperCase() + context.slice(1)} records purged.`, "success");
            if (context === 'student') refreshStudentsTable();
            if (context === 'resource') refreshResourcesTable();
            if (context === 'announcement') refreshNoticesTable();
            if (context === 'inquiry') refreshInquiriesTable();
            if (context === 'calendar') refreshCalendarTable(); // NEW: Bind instant table update callback
        }
    } catch (err) { showToast("Database synchronization dropped.", "error"); }
}

// ==========================================
// PART 6: INSTITUTE NOTICE ANNOUNCEMENT SYSTEM
// ==========================================
async function refreshNoticesTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`, { method: 'POST', body: JSON.stringify({ className: "9th" }) });
        const result = await response.json();
        const tbody = document.getElementById("noticesTableBody");
        tbody.innerHTML = "";
        if (result.status === "success") {
            if (result.notices.length === 0) { tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; padding:25px;">No active announcements found.</td></tr>`; return; }
            result.notices.forEach((item, index) => {
                const formattedDate = item.date ? new Date(item.date).toLocaleDateString() : 'Recent';
                tbody.innerHTML += `<tr><td><small style="color:#00f2fe; font-weight:600;">${formattedDate}</small></td><td><p style="font-size:14px; color:#e2e8f0; text-align:left;">${item.content}</p></td><td><button class="delete-row-btn" onclick="executeDeletion('Notice', ${index + 2}, 'announcement')">Delete</button></td></tr>`;
            });
        }
    } catch(err) { showToast("Failed to refresh announcements.", "error"); }
}

document.getElementById('noticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('noticeSubmitBtn');
    const noticeContentInput = document.getElementById('noticeContent');
    const payload = { content: noticeContentInput.value.trim() };
    submitBtn.innerText = "Broadcasting..."; submitBtn.disabled = true;
    try {
        const response = await fetch(`${SCRIPT_URL}?action=addNotice`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "success") { showToast("Notice live!", "success"); document.getElementById('noticeForm').reset(); refreshNoticesTable(); }
    } catch (err) { showToast("Notice network timeout.", "error"); }
    finally { submitBtn.innerText = "Broadcast Announcement"; submitBtn.disabled = false; }
});

// ==========================================
// PART 7: PUBLIC INQUIRY VIEWING OPERATIONS
// ==========================================
async function refreshInquiriesTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getInquiriesList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("inquiriesTableBody");
        if(!tbody) return; tbody.innerHTML = "";
        if (result.status === "success") {
            if (result.inquiries.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:25px;">No inquiries found.</td></tr>`; return; }
            result.inquiries.forEach(inq => {
                const formattedDate = inq.timestamp ? new Date(inq.timestamp).toLocaleDateString() : 'Recent';
                tbody.innerHTML += `<tr><td><small style="color:#00f2fe; font-weight:600;">${formattedDate}</small></td><td><strong>${inq.name}</strong></td><td><span class="subject-badge">${inq.class}</span></td><td>${inq.phone}</td><td><p style="font-size:13px; max-width:300px; color:#94a3b8; white-space:pre-wrap; text-align:left;">${inq.message || '-'}</p></td><td><button class="delete-row-btn" onclick="executeDeletion('Inquiries', ${inq.rowNum}, 'inquiry')">Clear</button></td></tr>`;
            });
        }
    } catch(err) { console.error(err); }
}

// ==========================================
// FIXED: PART 8: ACADEMIC CALENDAR ADMINISTRATIVE OPERATIONS 
// ==========================================
async function refreshCalendarTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCalendarEvents`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("calendarTableBody");
        if(!tbody) return;
        tbody.innerHTML = "";
        
        if (result.status === "success" && result.events) {
            if (result.events.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b; padding:25px;">No scheduled track items found on sheet registers.</td></tr>`;
                return;
            }
            
            result.events.forEach((ev, index) => {
                const formattedDate = ev.date ? new Date(ev.date).toLocaleDateString() : 'Pending';
                const rowNum = index + 2; // Offset Excel Row 1 Header index
                
                tbody.innerHTML += `
                    <tr>
                        <td><strong style="color:#f1f5f9;">${formattedDate}</strong></td>
                        <td><span style="background:rgba(255,255,255,0.04); padding:4px 8px; border-radius:4px; font-size:12px;">Class ${ev.targetClass}</span></td>
                        <td style="text-align:left;">${ev.title}</td>
                        <td><em style="color:#00f2fe; font-size:13px; font-weight:600;">${ev.type}</em></td>
                        <td>
                            <button class="delete-row-btn" onclick="executeDeletion('Events', ${rowNum}, 'calendar')">Remove</button>
                        </td>
                    </tr>`;
            });
        }
    } catch (err) {
        console.error("Calendar operational roster sync crash:", err);
    }
}

document.getElementById('calendarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('calendarSubmitBtn');
    
    const payload = {
        date: document.getElementById('eventDate').value,
        targetClass: document.getElementById('eventClass').value,
        title: document.getElementById('eventTitle').value.trim(),
        type: document.getElementById('eventType').value
    };

    btn.innerText = "Publishing Event Registry...";
    btn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=addCalendarEvent`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.status === "success") {
            showToast("Academic event successfully synchronized!", "success");
            document.getElementById('calendarForm').reset();
            refreshCalendarTable(); // Re-render staff ledger instantly
        }
    } catch (err) {
        showToast("Calendar pipeline connection drop.", "error");
    } finally {
        btn.innerText = "Publish Event to Ticker";
        btn.disabled = false;
    }
});

// Logout hook closure check
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('staffLoggedIn');
        window.location.href = 'index.html';
    });
}