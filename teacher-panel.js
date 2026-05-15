// CRITICAL: Update this URL to match your newest deployment Web App URL exactly!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFoyYB5gN6mtwhdmaUFN5Yb_rx87JY63HtgXslfb_K3GsxconZ9VmVX0y_BW5Q7LaZag/exec";

// ==========================================
// PART 1: CORE ORCHESTRATION & SETUP
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    refreshStudentsTable();
    refreshResourcesTable();
    refreshApprovalsTable(); 
    setupSubjectFilters(); // Initializes commerce blockages for junior high tracks
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

// Dynamic Dropdown Filtering Engine for Junior Classes
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
    } catch(err) { 
        console.error("Sync failure.");
        showToast("Failed to sync active rosters.", "error");
    }
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
        } else {
            showToast(result.message || "Execution error.", "error");
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
    } catch(err) { 
        showToast("Failed to refresh catalog files.", "error");
    }
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
        
        if (file.size > 150000) { 
            showToast("File limits clipped out! Stay under 150KB.", "error");
            submitBtn.innerText = "Publish to Dashboard";
            submitBtn.disabled = false;
            return;
        }
        try {
            payload.fileData = await toBase64(file);
            payload.fileMime = file.type;
        } catch (err) {
            showToast("Binary structure compilation crash.", "error");
            submitBtn.disabled = false;
            return;
        }
    } else {
        payload.link = document.getElementById('resLink').value;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=addResource`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "success") {
            showToast("Material distributed to targeted class!", "success");
            document.getElementById('resourceForm').reset();
            toggleSourceInput();
            refreshResourcesTable();
        }
    } catch (err) { showToast("Resource cluster gateway timeout.", "error"); }
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
                tbody.innerHTML += `
                    <tr>
                        <td>${req.name}</td>
                        <td>Class ${req.class}</td>
                        <td><code>${req.id}</code></td>
                        <td>
                            <button class="submit-btn" style="padding: 6px 12px; font-size: 13px; margin-right: 5px;" onclick="processApproval(${req.rowNum}, true)">Approve Access</button>
                            <button class="delete-row-btn" style="padding: 6px 12px; font-size: 13px;" onclick="processApproval(${req.rowNum}, false)">Deny</button>
                        </td>
                    </tr>`;
            });
        } else {
            badge.style.display = "none";
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:25px;">No pending registration applications found.</td></tr>`;
        }
    } catch(err) { console.error("Error connecting with structural approval buffers."); }
}

async function processApproval(rowNum, statusFlag) {
    const targetEndpoint = statusFlag ? 'approveStudent' : 'deleteRow';
    const safetyMessage = statusFlag 
        ? "Authorize account clearance permissions and migrate profile into structural active student registers?" 
        : "Deny entry access rules and purge registration request payload?";
        
    if (!confirm(safetyMessage)) {
        showToast("Operation cancelled.", "error");
        return;
    }
    
    const processingPayload = statusFlag 
        ? { rowNum: rowNum } 
        : { sheetName: 'Approvals', rowNum: rowNum };

    try {
        const response = await fetch(`${SCRIPT_URL}?action=${targetEndpoint}`, { 
            method: 'POST', 
            body: JSON.stringify(processingPayload) 
        });
        const result = await response.json();
        
        if (result.status === "success") {
            showToast(statusFlag ? "Access rules established! Profile initialized." : "Application record dropped.", "success");
            refreshApprovalsTable();
            refreshStudentsTable(); 
        } else {
            showToast("Database state alteration error.", "error");
        }
    } catch (err) { showToast("Pipeline transactional error.", "error"); }
}

// ==========================================
// PART 5: DELETION ENGINE & SESSION CLOSURES
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
        } else {
            showToast("Deletion execution breakdown.", "error");
        }
    } catch (err) { showToast("Database synchronization dropped.", "error"); }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('staffLoggedIn');
    showToast("Session disconnected. Relocating...", "success");
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1000);
});