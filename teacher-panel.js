const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWvJYEEx-fIt8_W78w8SWNC2g5z5EOVE8GodxXBJ5UlGtBRSfwwDigVLO1OwAbs03mOw/exec";

document.addEventListener("DOMContentLoaded", () => {
    refreshStudentsTable();
    refreshResourcesTable();
});

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
        // Appended explicit URL parameters to bypass the Google Apps Script 'undefined parameter' crash
        const response = await fetch(`${SCRIPT_URL}?action=getStudentsList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("studentsTableBody");
        tbody.innerHTML = "";
        
        if (result.status === "success") {
            result.students.forEach(s => {
                tbody.innerHTML += `<tr><td>${s.name}</td><td>Class ${s.class}</td><td><code>${s.id}</code></td><td><button class="delete-row-btn" onclick="executeDeletion('Students', ${s.rowNum}, 'student')">Remove</button></td></tr>`;
            });
        }
    } catch(err) { console.error("Sync failure."); }
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
        // Form submitted using parameter endpoints
        const response = await fetch(`${SCRIPT_URL}?action=addStudent`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.status === "success") {
            alert("Student Registered successfully.");
            document.getElementById('studentForm').reset();
            refreshStudentsTable();
        }
    } catch (err) { alert("Communication failed with sheets gateway."); }
});

// --- RESOURCE OPS ---
async function refreshResourcesTable() {
    try {
        // Appended explicit URL parameters to bypass the Google Apps Script 'undefined parameter' crash
        const response = await fetch(`${SCRIPT_URL}?action=getResourcesList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("resourcesTableBody");
        tbody.innerHTML = "";
        
        if (result.status === "success") {
            result.resources.forEach(r => {
                tbody.innerHTML += `<tr><td><strong>${r.subject}</strong></td><td>${r.topic}</td><td>Class ${r.class}</td><td><button class="delete-row-btn" onclick="executeDeletion('Resources', ${r.rowNum}, 'resource')">Delete</button></td></tr>`;
            });
        }
    } catch(err) { console.error("Sync failure."); }
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
        if (fileInput.files.length === 0) { alert("Please select a file."); return; }
        submitBtn.innerText = "Processing File Text...";
        submitBtn.disabled = true;
        const file = fileInput.files[0];
        
        if (file.size > 150000) { 
            alert("File too large! Keep under 150KB for raw text sheets cells.");
            submitBtn.innerText = "Publish to Dashboard";
            submitBtn.disabled = false;
            return;
        }
        try {
            payload.fileData = await toBase64(file);
            payload.fileMime = file.type;
        } catch (err) {
            alert("Error parsing binary file mapping.");
            return;
        }
    } else {
        payload.link = document.getElementById('resLink').value;
    }

    try {
        // Form submitted using parameter endpoints
        const response = await fetch(`${SCRIPT_URL}?action=addResource`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "success") {
            alert("Resource Published directly to Student dashboard!");
            document.getElementById('resourceForm').reset();
            toggleSourceInput();
            refreshResourcesTable();
        }
    } catch (err) { alert("Error connecting to script."); }
    finally { submitBtn.innerText = "Publish to Dashboard"; submitBtn.disabled = false; }
});

async function executeDeletion(sheetName, rowNum, context) {
    if (!confirm(`Permanently delete this ${context}?`)) return;
    try {
        // Deletion triggered via explicit parameter router mapping
        const response = await fetch(`${SCRIPT_URL}?action=deleteRow`, { method: 'POST', body: JSON.stringify({ sheetName: sheetName, rowNum: rowNum }) });
        const result = await response.json();
        if (result.status === "success") {
            alert("Deleted successfully.");
            if (context === 'student') refreshStudentsTable();
            if (context === 'resource') refreshResourcesTable();
        }
    } catch (err) { alert("Network dropped error."); }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('staffLoggedIn');
    window.location.href = 'index.html';
});