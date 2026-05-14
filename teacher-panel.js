const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWvJYEEx-fIt8_W78w8SWNC2g5z5EOVE8GodxXBJ5UlGtBRSfwwDigVLO1OwAbs03mOw/exec";

document.addEventListener("DOMContentLoaded", () => {
    refreshStudentsTable();
    refreshResourcesTable();
});

// Universal Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error("Toast container missing from HTML!");
        return;
    }
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

// --- STUDENT OPS ---
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
        showToast("Failed to refresh student list.", "error");
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
            showToast("Student Registered successfully!", "success");
            document.getElementById('studentForm').reset();
            refreshStudentsTable();
        } else {
            showToast(result.message || "Registration failed.", "error");
        }
    } catch (err) { 
        showToast("Communication failed with sheets gateway.", "error"); 
    }
});

// --- RESOURCE OPS ---
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
        console.error("Sync failure.");
        showToast("Failed to refresh resource catalog.", "error");
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
        if (fileInput.files.length === 0) { 
            showToast("Please select a file to upload.", "error"); 
            return; 
        }
        submitBtn.innerText = "Processing File...";
        submitBtn.disabled = true;
        const file = fileInput.files[0];
        
        if (file.size > 150000) { 
            showToast("File too large! (Limit: 150KB)", "error");
            submitBtn.innerText = "Publish to Dashboard";
            submitBtn.disabled = false;
            return;
        }
        try {
            payload.fileData = await toBase64(file);
            payload.fileMime = file.type;
        } catch (err) {
            showToast("Error processing file data.", "error");
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
            showToast("Resource Published to Dashboard!", "success");
            document.getElementById('resourceForm').reset();
            toggleSourceInput();
            refreshResourcesTable();
        } else {
            showToast(result.message || "Upload failed.", "error");
        }
    } catch (err) { 
        showToast("Error connecting to script.", "error"); 
    } finally { 
        submitBtn.innerText = "Publish to Dashboard"; 
        submitBtn.disabled = false; 
    }
});

async function executeDeletion(sheetName, rowNum, context) {
    if (!confirm(`Permanently delete this ${context}?`)) return;
    try {
        const response = await fetch(`${SCRIPT_URL}?action=deleteRow`, { method: 'POST', body: JSON.stringify({ sheetName: sheetName, rowNum: rowNum }) });
        const result = await response.json();
        if (result.status === "success") {
            showToast(`${context.charAt(0).toUpperCase() + context.slice(1)} removed successfully.`, "success");
            if (context === 'student') refreshStudentsTable();
            if (context === 'resource') refreshResourcesTable();
        } else {
            showToast("Deletion failed.", "error");
        }
    } catch (err) { 
        showToast("Network error during deletion.", "error"); 
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('staffLoggedIn');
    showToast("Logging out...", "success");
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});