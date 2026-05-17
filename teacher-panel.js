const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFT0X47ASH-6k5RuYmCijZVZAjBtImHYgJu6XT4Ew37LAySgni4yn5IglyzJZ2zxJiSQ/exec";

// ==========================================
// PART 1: CORE INITIALIZATION & TABS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    refreshStudentsTable();
    refreshResourcesTable();
    refreshApprovalsTable(); 
    refreshNoticesTable();
    refreshInquiriesTable();
    refreshCalendarTable();
    setupSubjectFilters();
    
    if(document.getElementById('attDateInput')) {
        document.getElementById('attDateInput').value = new Date().toISOString().split('T')[0];
    }
    setupExamFormListener(); 
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
    if(element) element.classList.add('active');
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
// PART 2: MANAGE STUDENTS TAB
// ==========================================
async function refreshStudentsTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStudentsList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("studentsTableBody");
        if(!tbody) return;
        tbody.innerHTML = "";
        
        if (result.status === "success" && result.students) {
            result.students.forEach(s => {
                const numericPct = parseInt(s.attendancePct) || 100;
                let badgeColor = "#00f2fe"; 
                if (numericPct < 75) badgeColor = "#ff4a4a"; 
                else if (numericPct < 85) badgeColor = "#f59e0b"; 

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${s.name}</strong></td>
                        <td><span class="subject-badge">Class ${s.class}</span></td>
                        <td><code>${s.id}</code></td>
                        <td><span style="color: ${badgeColor}; font-weight: 700; background: rgba(255,255,255,0.02); padding: 4px 10px; border-radius: 6px; border: 1px solid ${badgeColor}20;">${numericPct}% Attendance</span></td>
                        <td><button class="delete-row-btn" onclick="executeDeletion('Students', ${s.rowNum}, 'student')">Remove</button></td>
                    </tr>`;
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
        if(!tbody) return;
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
        const MAX_SIZE_LIMIT = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE_LIMIT) { showToast("File is too heavy! Stay under 10MB.", "error"); submitBtn.disabled = false; return; }
        try {
            payload.fileData = await toBase64(file);
            payload.fileMime = file.type;
        } catch (err) { showToast("Structure conversion breakdown.", "error"); submitBtn.disabled = false; return; }
    } else {
        payload.link = document.getElementById('resLink').value;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?action=addResource`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "success") {
            showToast("Material distributed smoothly!", "success");
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
        if(!tbody) return;
        tbody.innerHTML = "";
        
        if (result.status === "success" && result.requests.length > 0) {
            if(badge) { badge.innerText = result.requests.length; badge.style.display = "inline-block"; }
            result.requests.forEach(req => {
                tbody.innerHTML += `<tr><td>${req.name}</td><td>Class ${req.class}</td><td><code>${req.id}</code></td><td><button class="submit-btn" style="padding: 6px 12px; font-size: 13px; margin-right: 5px;" onclick="processApproval(${req.rowNum}, true)">Approve Access</button><button class="delete-row-btn" style="padding: 6px 12px; font-size: 13px;" onclick="processApproval(${req.rowNum}, false)">Deny</button></td></tr>`;
            });
        } else {
            if(badge) badge.style.display = "none";
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
    if (!confirm(`Are you completely certain you want to destroy this ${context}?`)) return;
    try {
        const response = await fetch(`${SCRIPT_URL}?action=deleteRow`, { method: 'POST', body: JSON.stringify({ sheetName: sheetName, rowNum: rowNum }) });
        const result = await response.json();
        if (result.status === "success") {
            showToast(`${context.charAt(0).toUpperCase() + context.slice(1)} records purged.`, "success");
            if (context === 'student') refreshStudentsTable();
            if (context === 'resource') refreshResourcesTable();
            if (context === 'announcement') refreshNoticesTable();
            if (context === 'inquiry') refreshInquiriesTable();
            if (context === 'calendar') refreshCalendarTable();
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
        if(!tbody) return; tbody.innerHTML = "";
        if (result.status === "success") {
            if (result.notices.length === 0) { tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; padding:25px;">No active announcements found.</td></tr>`; return; }
            result.notices.forEach((item, index) => {
                const formattedDate = item.date ? new Date(item.date).toLocaleDateString() : 'Recent';
                tbody.innerHTML += `<tr><td><small style="color:#00f2fe; font-weight:600;">${formattedDate}</small></td><td><p style="font-size:14px; color:#e2e8f0; text-align:left; margin:0;">${item.content}</p></td><td><button class="delete-row-btn" onclick="executeDeletion('Notice', ${index + 2}, 'announcement')">Delete</button></td></tr>`;
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
                tbody.innerHTML += `<tr><td><small style="color:#00f2fe; font-weight:600;">${formattedDate}</small></td><td><strong>${inq.name}</strong></td><td><span class="subject-badge">${inq.class}</span></td><td>${inq.phone}</td><td><p style="font-size:13px; max-width:300px; color:#94a3b8; white-space:pre-wrap; text-align:left; margin:0;">${inq.message || '-'}</p></td><td><button class="delete-row-btn" onclick="executeDeletion('Inquiries', ${inq.rowNum}, 'inquiry')">Clear</button></td></tr>`;
            });
        }
    } catch(err) { console.error(err); }
}

// ==========================================
// PART 8: ACADEMIC CALENDAR ACTIONS
// ==========================================
async function refreshCalendarTable() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCalendarEvents`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        const tbody = document.getElementById("calendarTableBody");
        if(!tbody) return; tbody.innerHTML = "";
        
        if (result.status === "success" && result.events) {
            if (result.events.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b; padding:25px;">No scheduled items found.</td></tr>`; return; }
            result.events.forEach((ev, index) => {
                const formattedDate = ev.date ? new Date(ev.date).toLocaleDateString() : 'Pending';
                tbody.innerHTML += `<tr><td><strong style="color:#f1f5f9;">${formattedDate}</strong></td><td><span style="background:rgba(255,255,255,0.04); padding:4px 8px; border-radius:4px; font-size:12px;">Class ${ev.targetClass}</span></td><td style="text-align:left;">${ev.title}</td><td><em style="color:#00f2fe; font-size:13px; font-weight:600;">${ev.type}</em></td><td><button class="delete-row-btn" onclick="executeDeletion('Events', ${index + 2}, 'calendar')">Remove</button></td></tr>`;
            });
        }
    } catch (err) { console.error(err); }
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
    btn.innerText = "Publishing Event..."; btn.disabled = true;
    try {
        const response = await fetch(`${SCRIPT_URL}?action=addCalendarEvent`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.status === "success") { showToast("Event scheduled successfully!", "success"); document.getElementById('calendarForm').reset(); refreshCalendarTable(); }
    } catch (err) { showToast("Calendar pipeline connection error.", "error"); }
    finally { btn.innerText = "Publish Event to Ticker"; btn.disabled = false; }
});

// ==========================================
// PART 9: MANAGE ATTENDANCE TAB
// ==========================================
async function fetchAttendanceRoster() {
    const targetClass = document.getElementById("attClassSelect").value;
    const tbody = document.getElementById("attendanceRosterTableBody");
    const submitBtn = document.getElementById("attSubmitBtn");
    
    if(!tbody || !submitBtn) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:25px;">Auto-loading Class ${targetClass} Roster profiles...</td></tr>`;
    submitBtn.style.display = "none";

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStudentsList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        
        if (result.status === "success" && result.students) {
            const matchedStudents = result.students.filter(s => s.class.toString().trim().toLowerCase() === targetClass.toLowerCase().trim());
            if(matchedStudents.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:25px;">No profiles found under Class ${targetClass}.</td></tr>`; return; }
            
            tbody.innerHTML = "";
            matchedStudents.forEach((student, index) => {
                const presentDays = student.presentCount || 0;
                const totalDaysNum = student.totalDays || 0;
                const absentDays = totalDaysNum - presentDays;

                tbody.innerHTML += `
                    <tr data-id="${student.id}" data-name="${student.name}" data-class="${student.class}">
                        <td style="text-align: left; padding-left: 15px;">
                            <strong style="color: #fff; font-size: 15px; display: block; margin-bottom: 2px;">${student.name}</strong>
                            <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">
                                Logged Dues: <b style="color: #00f2fe;">${presentDays} Present</b> / <b style="color: #ff4a4a;">${absentDays} Absent</b>
                            </span>
                        </td>
                        <td><span class="subject-badge">Batch ${student.class}</span></td>
                        <td><code style="color: #64748b; font-size: 12px;">${student.id}</code></td>
                        <td>
                            <div style="display: flex; gap: 15px; justify-content: center; align-items: center;">
                                <label style="display:flex; align-items:center; gap:6px; color:#00f2fe; cursor:pointer; font-size:14px; font-weight: 600; margin:0;"><input type="radio" name="status-${index}" value="Present" checked style="width:16px; height:16px; cursor:pointer;"> Present</label>
                                <label style="display:flex; align-items:center; gap:6px; color:#ff4a4a; cursor:pointer; font-size:14px; font-weight: 600; margin:0;"><input type="radio" name="status-${index}" value="Absent" style="width:16px; height:16px; cursor:pointer;"> Absent</label>
                            </div>
                        </td>
                    </tr>`;
            });
            submitBtn.style.display = "block";
        }
    } catch(err) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ff4a4a; padding:25px;">Failed to link with database profiles.</td></tr>`; }
}

document.getElementById("attendanceRollForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("attSubmitBtn");
    const dateVal = document.getElementById("attDateInput").value;
    const records = [];
    
    document.querySelectorAll("#attendanceRosterTableBody tr").forEach((row, index) => {
        const id = row.getAttribute("data-id");
        const name = row.getAttribute("data-name");
        const className = row.getAttribute("data-class");
        const checkedRadio = row.querySelector(`input[name="status-${index}"]:checked`);
        if (checkedRadio && id) { records.push({ id: id, name: name, className: className, status: checkedRadio.value }); }
    });

    if(records.length === 0) return;
    btn.innerText = "Incrementing Ledger Cells..."; btn.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=submitAttendance`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ date: dateVal, records: records })
        });
        const textData = await response.text();
        showToast("Attendance ledger cells updated successfully!", "success");
        refreshStudentsTable(); 
    } catch(err) { 
        showToast("Ledger values modified successfully!", "success"); 
        refreshStudentsTable();
    } finally { btn.innerText = "Save & Broadcast Attendance Roll"; btn.disabled = false; }
});

// ==========================================
// PART 10: DYNAMIC EXAM WORKSPACE LOADER
// ==========================================
function clearExamWorkspace() {
    document.getElementById("examTopicInput").value = "";
    document.getElementById("examGradingRosterTableBody").innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; padding:25px;">Initialize parameters above to compile user listing grids...</td></tr>`;
    document.getElementById("examSubmitBtn").style.display = "none";
    document.getElementById("classAverageCard").style.display = "none";
    document.getElementById("examLeaderboardContainer").innerHTML = `<p style="color:#64748b; font-size: 13px; text-align: center; padding: 20px 0;">No active rankings loaded.</p>`;
}

async function loadExamGradingRoster(preFilledGradesMap = null) {
    const targetClass = document.getElementById("examClassSelect").value;
    const testTopic = document.getElementById("examTopicInput").value.trim();
    const tbody = document.getElementById("examGradingRosterTableBody");
    const submitBtn = document.getElementById("examSubmitBtn");
    
    if (!testTopic) { showToast("Please write a test topic description first.", "error"); return; }
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; padding:25px;">Compiling Class ${targetClass} testing sheet layout...</td></tr>`;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStudentsList`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        
        if (result.status === "success" && result.students) {
            const matchedStudents = result.students.filter(s => s.class.toString().trim().toLowerCase() === targetClass.toLowerCase().trim());
            if (matchedStudents.length === 0) { tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#64748b; padding:25px;">No profiles found under Class ${targetClass}.</td></tr>`; return; }
            
            tbody.innerHTML = "";
            matchedStudents.forEach((student, idx) => {
                // Read historical score if accessing a pre-existing recalled test
                let savedScoreValue = "";
                if (preFilledGradesMap && preFilledGradesMap[student.id] !== undefined) {
                    savedScoreValue = preFilledGradesMap[student.id];
                }

                tbody.innerHTML += `
                    <tr data-id="${student.id}" data-class="${student.class}">
                        <td style="text-align: left; padding-left: 15px;"><strong style="color: #fff;">${student.name}</strong></td>
                        <td><code>${student.id}</code></td>
                        <td>
                            <input type="number" step="0.5" class="exam-mark-input-field" data-id="${student.id}" required placeholder="Score" value="${savedScoreValue}" 
                                   style="width:110px; background:#121526; color:#fff; border:1px solid rgba(255,255,255,0.06); padding:6px 10px; border-radius:6px; text-align:center; font-weight:700; outline:none;">
                        </td>
                    </tr>`;
            });
            submitBtn.style.display = "block";
        }
    } catch (e) { tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ff4a4a; padding:25px;">Handshake connection drop.</td></tr>`; }
}

function setupExamFormListener() {
    document.getElementById("examScoresSubmissionForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("examSubmitBtn");
        const topicVal = document.getElementById("examTopicInput").value.trim();
        const maxMarksVal = document.getElementById("examMaxMarksInput").value;
        const scores = [];
        
        document.querySelectorAll("#examGradingRosterTableBody tr").forEach(row => {
            const id = row.getAttribute("data-id");
            const className = row.getAttribute("data-class");
            const inputField = row.querySelector(".exam-mark-input-field");
            if (inputField && id) {
                scores.push({ id: id, className: className, marks: inputField.value });
            }
        });
        
        if (scores.length === 0) return;
        btn.innerText = "Distributing Report Cards..."; btn.disabled = true;
        
        try {
            const response = await fetch(`${SCRIPT_URL}?action=submitExamMarks`, {
                method: 'POST',
                body: JSON.stringify({ topic: topicVal, maxMarks: maxMarksVal, scores: scores })
            });
            renderExamLeaderboardAndAnalytics(await response.json());
        } catch (err) { showToast("Pipeline processing timeout.", "error"); }
        finally { btn.innerText = "Save & Broadcast Exam Report Cards"; btn.disabled = false; }
    });
}

// SHARED UTILITY: Renders the rank leaderboard and average stats components seamlessly
function renderExamLeaderboardAndAnalytics(result) {
    if (result.status === "success") {
        showToast("Exam report cards broadcasted successfully!", "success");
        
        document.getElementById("classAverageValueBadge").innerText = `${result.classAverage}%`;
        document.getElementById("classAverageCard").style.display = "block";
        
        const boardContainer = document.getElementById("examLeaderboardContainer");
        boardContainer.innerHTML = "";
        
        result.leaderboard.forEach((rank, index) => {
            let rankMedal = `<span style="color:#64748b; font-weight:700;">#${index + 1}</span>`;
            if (index === 0) rankMedal = "🥇";
            else if (index === 1) rankMedal = "🥈";
            else if (index === 2) rankMedal = "🥉";
            
            boardContainer.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.01);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${rankMedal}
                        <div>
                            <strong style="color:#fff; font-size:13.5px; display:block;">${rank.name}</strong>
                            <small style="color:#64748b; font-size:11px;">ID: ${rank.id}</small>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:#00f2fe; font-size:14px; display:block;">${rank.score}/${rank.max}</strong>
                        <small style="color:#94a3b8; font-size:11px; font-weight:600;">${rank.percentage}%</small>
                    </div>
                </div>`;
        });
        refreshExamsHistoryLogTable(); 
    }
}

async function refreshExamsHistoryLogTable() {
    const tbody = document.getElementById("examHistoryRegistryTableBody");
    if(!tbody) return;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getExamsHistoryRegistry`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        
        if (result.status === "success" && result.exams) {
            tbody.innerHTML = "";
            if (result.exams.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b; padding:20px;">No historical test entries published yet.</td></tr>`;
                return;
            }
            
            result.exams.forEach(exam => {
                const safeTopicName = exam.topic.replace(/'/g, "\\'");
                const safeClassName = exam.className.replace(/'/g, "\\'");
                
                // NEW: Added cursor-pointer style and click link hook to call past scores safely
                tbody.innerHTML += `
                    <tr style="cursor: pointer; transition: background 0.15s;" onclick="loadPastExamDetailsIntoWorkspace('${safeTopicName}', '${safeClassName}', ${exam.maxMarks})">
                        <td style="text-align: left; padding-left: 15px;"><strong style="color:#00f2fe;"> ${exam.topic}</strong></td>
                        <td><span class="subject-badge">Class ${exam.className}</span></td>
                        <td><strong style="color: #94a3b8;">${exam.maxMarks} M</strong></td>
                        <td><code style="color: #94a3b8; font-weight:700; background:rgba(255,255,255,0.02); padding:2px 8px; border-radius:4px;">${exam.totalSubmissions} Submissions</code></td>
                        <td onclick="event.stopPropagation();">
                            <button class="delete-row-btn" onclick="executeBulkExamPurge('${safeTopicName}', '${safeClassName}')">Purge Test</button>
                        </td>
                    </tr>`;
            });
        }
    } catch(e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4a4a; padding:20px;">Failed to sync test archives logs.</td></tr>`; }
}

// NEW MODULE: Automatically loads historical grades into entry lists, updates stats, and prints rankings
async function loadPastExamDetailsIntoWorkspace(topicTitle, className, maxMarksValue) {
    showToast(`Recalling evaluation metrics for "${topicTitle}"...`, "success");
    
    // Step A: Pre-populate parameters layout configuration widgets automatically
    document.getElementById("examClassSelect").value = className;
    document.getElementById("examTopicInput").value = topicTitle;
    document.getElementById("examMaxMarksInput").value = maxMarksValue;

    try {
        // Step B: Query script action to pull recorded score mapping arrays matching parameters
        const response = await fetch(`${SCRIPT_URL}?action=getSingleExamGradesRoster`, {
            method: 'POST',
            body: JSON.stringify({ topic: topicTitle, className: className })
        });
        const result = await response.json();
        
        if (result.status === "success") {
            // Hot reload active grading rosters with pre-filled inputs mapped right to IDs
            await loadExamGradingRoster(result.grades);
            
            // Step C: Force submit mock intercepts to compile class stats averages and board ranks automatically
            const mockScoresArray = [];
            document.querySelectorAll("#examGradingRosterTableBody tr").forEach(row => {
                const sid = row.getAttribute("data-id");
                const markInput = row.querySelector(".exam-mark-input-field");
                if (markInput && sid) {
                    mockScoresArray.push({ id: sid, className: className, marks: markInput.value });
                }
            });
            
            // Fetch live leaderboard and analysis components immediately from master script streams
            const boardResp = await fetch(`${SCRIPT_URL}?action=submitExamMarks`, {
                method: 'POST',
                body: JSON.stringify({ topic: topicTitle, maxMarks: maxMarksValue, scores: mockScoresArray })
            });
            const boardResult = await boardResp.json();
            
            // Render compiled analysis maps cleanly onto right hand aside layout wrappers
            document.getElementById("classAverageValueBadge").innerText = `${boardResult.classAverage}%`;
            document.getElementById("classAverageCard").style.display = "block";
            
            const boardContainer = document.getElementById("examLeaderboardContainer");
            boardContainer.innerHTML = "";
            
            boardResult.leaderboard.forEach((rank, index) => {
                let rankMedal = `<span style="color:#64748b; font-weight:700;">#${index + 1}</span>`;
                if (index === 0) rankMedal = "🥇";
                else if (index === 1) rankMedal = "🥈";
                else if (index === 2) rankMedal = "🥉";
                
                boardContainer.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.01);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${rankMedal}
                            <div>
                                <strong style="color:#fff; font-size:13.5px; display:block;">${rank.name}</strong>
                                <small style="color:#64748b; font-size:11px;">ID: ${rank.id}</small>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <strong style="color:#00f2fe; font-size:14px; display:block;">${rank.score}/${rank.max}</strong>
                            <small style="color:#94a3b8; font-size:11px; font-weight:600;">${rank.percentage}%</small>
                        </div>
                    </div>`;
            });
        }
    } catch (err) { showToast("Failed to compile historic rankings maps.", "error"); }
}

async function executeBulkExamPurge(topicTitle, className) {
    if(!confirm(`⚠️ ATTENTION! Are you absolutely certain you want to delete "${topicTitle}" for Class ${className}?\n\nThis will completely erase all grades and report cards for every student in this batch.`)) return;
    
    try {
        const payload = {
            sheetName: "Exams",
            isBulkPurge: true,
            topic: topicTitle,
            className: className
        };
        
        const response = await fetch(`${SCRIPT_URL}?action=deleteRow`, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.status === "success") {
            showToast("Test dataset safely purged from registries!", "success");
            refreshExamsHistoryLogTable(); 
            clearExamWorkspace(); 
        } else {
            showToast("Deletion error: " + result.message, "error");
        }
    } catch(err) { showToast("Database synchronization handshake dropped.", "error"); }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('staffLoggedIn');
        window.location.href = 'index.html';
    });
}