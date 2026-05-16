const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-h4118pk_xz7Z9txxTUJjj2xV8Qo6LFb9Am7sA0X3fFzRbwMr-bqO0AWFigaprCQOMA/exec";
let allResources = [];
let monthEventsList = [];

// ==========================================
// PART 1: INITIALIZATION & SECURITY GATEKEEPER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const sName = sessionStorage.getItem("studentName");
    const sClass = sessionStorage.getItem("studentClass");
    const sID = sessionStorage.getItem("studentID");

    if (!sID || !sClass) {
        alert("Access Denied. Please login through the portal.");
        window.location.href = "index.html";
        return;
    }
    
    // Mount profile data onto dashboard elements
    document.getElementById("welcomeName").innerText = `Hi, ${sName}!`;
    document.getElementById("studentMeta").innerText = `Class: ${sClass} | ID: ${sID}`;
    
    // Hide Commerce filter tags for 9th and 10th graders
    const isCommerceEligible = ["11th", "12th"].includes(sClass.trim());
    if (!isCommerceEligible) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const btnText = btn.innerText.trim();
            if (["Accounts", "Economics", "B.st"].includes(btnText)) {
                btn.style.display = 'none';
            }
        });
    }

    // Launch background synchronous pipelines
    loadDashboardContent(sClass);
    loadCalendarEngine(sClass); 
});

// ==========================================
// PART 2: DATA SYNC (RESOURCES & NOTICES)
// ==========================================
async function loadDashboardContent(className) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`, {
            method: 'POST',
            body: JSON.stringify({ className: className })
        });
        const result = await response.json();
        
        if(result.status === "success") {
            const noticeContainer = document.getElementById("noticeContainer");
            noticeContainer.innerHTML = "";
            
            if(result.notices.length === 0) {
                noticeContainer.innerHTML = `<p style="color:#64748b;">No active announcements.</p>`;
            } else {
                result.notices.forEach(item => {
                    const formattedDate = item.date ? new Date(item.date).toLocaleDateString() : 'Recent';
                    noticeContainer.innerHTML += `<div class="notice-item"><small>${formattedDate}</small><p style="margin-top:4px;">${item.content}</p></div>`;
                });
            }
            allResources = result.resources;
            renderResources(allResources);
        }
    } catch(err) { 
        console.error("Notice stream synchronization breakdown:", err); 
    }
}

// ==========================================
// PART 3: ACADEMIC CALENDAR ENGINE MODULE
// ==========================================
async function loadCalendarEngine(studentClass) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCalendarEvents`, { 
            method: 'POST', 
            body: JSON.stringify({}) 
        });
        const result = await response.json();
        
        if (result.status === "success" && result.events) {
            // Keep items matching current batch or marked global "All"
            monthEventsList = result.events.filter(e => 
                e.targetClass.toLowerCase() === "all" || 
                e.targetClass.toLowerCase() === studentClass.toLowerCase().trim()
            );
            renderVisualCalendar();
        }
    } catch (err) { 
        console.error("Calendar network query failure:", err); 
    }
}

function renderVisualCalendar() {
    const dayGrid = document.getElementById("calendarDaysGrid");
    const monthTitle = document.getElementById("calendarMonthTitle");
    const agendaList = document.getElementById("agendaEventList");
    
    if (!dayGrid || !monthTitle || !agendaList) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    dayGrid.innerHTML = "";
    agendaList.innerHTML = "";
    
    // 1. Padding blank components for index offsets
    for (let x = 0; x < firstDayIndex; x++) {
        dayGrid.innerHTML += `<div style="padding:10px; background: transparent;"></div>`;
    }
    
    let activeAgendaItemsHtml = "";
    
    // 2. Compute rows and attach tracking indicators
    for (let day = 1; day <= totalDays; day++) {
        const targetDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayEvents = monthEventsList.filter(e => {
            if (!e.date) return false;
            const parsedEventDate = new Date(e.date);
            if (isNaN(parsedEventDate.getTime())) return false; 
            
            const eventYear = parsedEventDate.getFullYear();
            const eventMonth = parsedEventDate.getMonth() + 1;
            const eventDay = parsedEventDate.getDate();
            
            const computedEventStr = `${eventYear}-${String(eventMonth).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}`;
            return computedEventStr === targetDayStr;
        });

        let dayStyle = "padding:12px 8px; background:#121526; border-radius:8px; text-align:center; font-size:13px; font-weight:600; color:#cbd5e1; border:1px solid rgba(255,255,255,0.02); position:relative;";
        let statusDotHtml = "";
        
        if (day === now.getDate()) {
            dayStyle += "border-color: #00f2fe; background: rgba(0, 242, 254, 0.05); color:#fff;";
        }
        
        if (dayEvents.length > 0) {
            let badgeColor = "#4facfe"; // Lecture Class: Blue
            if (dayEvents[0].type.toLowerCase() === "exam") badgeColor = "#f59e0b"; // Test: Orange
            if (dayEvents[0].type.toLowerCase() === "holiday") badgeColor = "#ef4444"; // Holiday: Red
            
            dayStyle += `background: rgba(255,255,255,0.04);`;
            statusDotHtml = `<span style="width:5px; height:5px; background:${badgeColor}; border-radius:50%; position:absolute; bottom:4px; left:50%; transform:translateX(-50%); display:inline-block;"></span>`;
            
            dayEvents.forEach(ev => {
                activeAgendaItemsHtml += `
                    <div style="border-left: 3px solid ${badgeColor}; background:rgba(255,255,255,0.02); padding:10px; border-radius:4px 8px 8px 4px; text-align: left; margin-bottom: 8px;">
                        <span style="font-size:11px; color:${badgeColor}; font-weight:700; text-transform:uppercase;">Day ${day} • ${ev.type}</span>
                        <p style="font-size:13px; color:#f1f5f9; margin-top:2px; font-weight:500; line-height: 1.4;">${ev.title}</p>
                    </div>`;
            });
        }
        
        dayGrid.innerHTML += `<div style="${dayStyle}">${day}${statusDotHtml}</div>`;
    }
    
    if (activeAgendaItemsHtml !== "") {
        agendaList.innerHTML = activeAgendaItemsHtml;
    } else {
        agendaList.innerHTML = `<p style="color:#64748b; font-size:13px; text-align:center; margin-top:40px;">No scheduled events or exams for this month.</p>`;
    }
}

// ==========================================
// PART 4: RESOURCES RENDERING & FILTERING
// ==========================================
function renderResources(items) {
    const grid = document.getElementById("resourcesGrid");
    grid.innerHTML = "";
    
    const currentStudentClass = (sessionStorage.getItem("studentClass") || "").trim();
    const isCommerceEligible = ["11th", "12th"].includes(currentStudentClass);

    const filteredItems = items.filter(res => {
        const isCommerceSubject = ["Accounts", "Economics", "B.St", "B.st"].includes(res.subject);
        if (isCommerceSubject && !isCommerceEligible) return false; 
        return true; 
    });
    
    if(filteredItems.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;"><p>No study materials uploaded for your class yet.</p></div>`;
        return;
    }
    
    filteredItems.forEach((res, index) => {
        grid.innerHTML += `
            <div class="resource-card">
                <div>
                    <div class="card-header">
                        <span class="subject-badge">${res.subject}</span>
                        <span class="type-badge">${res.type}</span>
                    </div>
                    <h4>${res.topic}</h4>
                </div>
                <button type="button" class="download-link" style="width:100%; border:none; cursor:pointer;" onclick="viewDocumentResource(${index})">View Material →</button>
            </div>`;
    });
}

function filterSubject(subject) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnText = btn.innerText.trim().toLowerCase();
        const targetSubject = subject.toLowerCase() === 'b.st' ? 'b.st' : subject.toLowerCase();
        if(subject === 'All' && btnText === 'all subjects') btn.classList.add('active'); 
        else if(btnText === targetSubject) btn.classList.add('active'); 
        else btn.classList.remove('active'); 
    });
    
    if(subject === 'All') renderResources(allResources); 
    else renderResources(allResources.filter(r => r.subject.toLowerCase() === subject.toLowerCase())); 
}

// ==========================================
// PART 5: LOGOUT & BLOB BINARY TRANSLATORS
// ==========================================
document.getElementById("studentLogout").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
});

window.viewDocumentResource = function(index) {
    const targetResource = allResources[index];
    if (!targetResource || !targetResource.link) { alert("Resource data missing."); return; }
    const rawDataString = targetResource.link;
    if (!rawDataString.startsWith("data:")) { window.open(rawDataString, '_blank'); return; }

    try {
        const parts = rawDataString.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];
        const binaryString = window.atob(base64Data);
        const binaryLength = binaryString.length;
        const bytesArray = new Uint8Array(binaryLength);
        for (let i = 0; i < binaryLength; i++) bytesArray[i] = binaryString.charCodeAt(i);
        const fileBlob = new Blob([bytesArray], { type: mimeType });
        const virtualUrlPath = URL.createObjectURL(fileBlob);
        window.open(virtualUrlPath, '_blank');
    } catch (error) { alert("Failed to reconstruct file stream."); }
};