const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFT0X47ASH-6k5RuYmCijZVZAjBtImHYgJu6XT4Ew37LAySgni4yn5IglyzJZ2zxJiSQ/exec";
let allResources = [];
let monthEventsList = [];
let clientLeaderboardsCache = {}; // Global memory cache variables map

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
    
    document.getElementById("welcomeName").innerText = `Hi, ${sName}!`;
    document.getElementById("studentMeta").innerText = `Class: ${sClass} | ID: ${sID}`;
    
    const isCommerceEligible = ["11th", "12th"].includes(sClass.trim());
    if (!isCommerceEligible) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const btnText = btn.innerText.trim();
            if (["Accounts", "Economics", "B.st"].includes(btnText)) {
                btn.style.display = 'none';
            }
        });
    }

    loadDashboardContent(sClass, sID);
    loadCalendarEngine(sClass); 
});

// ==========================================
// PART 2: DATA SYNC (RESOURCES, NOTICES, ATTENDANCE & EXAM COMPILER)
// ==========================================
async function loadDashboardContent(className, studentID) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`, {
            method: 'POST',
            body: JSON.stringify({ className: className, studentID: studentID })
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

            // ==========================================================
            // PROGRESS BAR ATTENDANCE CODES
            // ==========================================================
            const attBox = document.getElementById("attendanceAlertCard");
            const attBadge = document.getElementById("attendancePercentageBadge");
            const attNotice = document.getElementById("attendanceMotivationalNotice");
            const fillBar = document.getElementById("attendanceProgressBarFill");

            if (attBox && result.attendance) {
                const pct = result.attendance.percentage;
                attBadge.innerText = `${pct}%`;
                attBox.style.display = "block";

                if(fillBar) { fillBar.style.width = `${pct}%`; }

                if (pct < 75) {
                    if(fillBar) fillBar.style.background = "#ff4a4a"; 
                    attBox.style.borderColor = "rgba(255, 74, 74, 0.2)";
                    attBox.style.background = "rgba(255, 74, 74, 0.02)";
                    attNotice.innerHTML = `⚠️ <strong>Attendance Low!</strong> Your record is sitting below the mandatory threshold. Attend regular classes immediately to maintain eligibility.`;
                } else if (pct >= 75 && pct < 85) {
                    if(fillBar) fillBar.style.background = "#f59e0b"; 
                    attBox.style.borderColor = "rgba(245, 158, 11, 0.2)";
                    attBox.style.background = "rgba(245, 158, 11, 0.02)";
                    attNotice.innerHTML = `⚠️ <strong>Warning: Danger Zone.</strong> Your track history is approaching boundaries. Maintain attendance rules to avoid administrative review alerts.`;
                } else {
                    if(fillBar) fillBar.style.background = "linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)";
                    attBadge.style.color = "#00f2fe"; 
                    attBox.style.borderColor = "rgba(0, 242, 254, 0.1)";
                    attBox.style.background = "rgba(255, 255, 255, 0.01)";
                    attNotice.innerHTML = `✨ <strong>Excellent Standing!</strong> Your attendance trajectory is solid. Keep up the consistent dedication to your coaching curriculum.`;
                }
            }

            // ==========================================================
            // INDIVIDUAL HISTORICAL SCORING DATA CARDS COMPILER
            // ==========================================================
            const examTbody = document.getElementById("studentExamHistoryTableBody");
            if (examTbody && result.exams) {
                examTbody.innerHTML = "";
                if (result.exams.length === 0) {
                    examTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:15px; font-size:13px;">No test scores or graded records found for your account ID.</td></tr>`;
                } else {
                    result.exams.forEach(exam => {
                        let scoreColor = "#00f2fe";
                        if (exam.percentage < 50) scoreColor = "#ff4a4a";
                        else if (exam.percentage < 75) scoreColor = "#f59e0b";
                        
                        examTbody.innerHTML += `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
                                <td style="padding:14px 12px;"><strong>${exam.topic}</strong></td>
                                <td style="padding:14px 12px; text-align:center; font-weight:700; color:#fff;">${exam.marksObtained} Marks</td>
                                <td style="padding:14px 12px; text-align:center; color:#64748b;">${exam.maxMarks}</td>
                                <td style="padding:14px 12px; text-align:center; font-weight:800; color:${scoreColor};">${exam.percentage}%</td>
                            </tr>`;
                    });
                }
            }

            // ==========================================================
            // PRE-FILL USER SIDEWAYS LEADERBOARD OPTIONS
            // ==========================================================
            clientLeaderboardsCache = result.leaderboards || {};
            const selectorContainer = document.getElementById("studentLeaderboardTopicSelector");
            if (selectorContainer) {
                selectorContainer.innerHTML = `<option value="">-- Select Test Topic Scoreboard --</option>`;
                Object.keys(clientLeaderboardsCache).forEach(topicTitle => {
                    selectorContainer.innerHTML += `<option value="${topicTitle}">🏆 ${topicTitle}</option>`;
                });
            }
        }
    } catch(err) { console.error("Notice stream synchronization breakdown:", err); }
}

// ==========================================
// PART 3: SCOREBOARD DISPLAY ROUTING LOOPS
// ==========================================
function compileStudentViewLeaderboard() {
    const selectedTopic = document.getElementById("studentLeaderboardTopicSelector").value;
    const boardContainer = document.getElementById("studentLeaderboardRankList");
    const studentMetaID = sessionStorage.getItem("studentID").toString().toLowerCase().trim();
    
    if(!boardContainer) return;
    if(!selectedTopic) {
        boardContainer.innerHTML = `<p style="color: #64748b; font-size: 13px; text-align: center; padding-top: 40px;">Select an evaluation topic above to display rankings...</p>`;
        return;
    }
    
    const targetBoard = clientLeaderboardsCache[selectedTopic] || [];
    boardContainer.innerHTML = "";
    
    if(targetBoard.length === 0) {
        boardContainer.innerHTML = `<p style="color: #64748b; font-size: 13px; text-align: center; padding-top: 40px;">No peer records recorded under this topic.</p>`;
        return;
    }

    targetBoard.forEach((rank, index) => {
        let medalStr = `<span style="color:#64748b; font-weight:700; font-family:monospace; min-width:18px; display:inline-block;">#${index + 1}</span>`;
        if (index === 0) medalStr = "🥇";
        else if (index === 1) medalStr = "🥈";
        else if (index === 2) medalStr = "🥉";
        
        let highlightStyle = "background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.02);";
        if(rank.id.toString().toLowerCase().trim() === studentMetaID) {
            highlightStyle = "background: rgba(0, 242, 254, 0.04); border: 1px solid rgba(0, 242, 254, 0.2); box-shadow: 0 4px 12px rgba(0,242,254,0.05);";
        }
        
        boardContainer.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-radius:10px; ${highlightStyle}">
                <div style="display:flex; align-items:center; gap:12px;">
                    ${medalStr}
                    <div>
                        <strong style="color:#fff; font-size:13px; display:block;">${rank.name}</strong>
                        <small style="color:#64748b; font-size:11px;">ID: ${rank.id}</small>
                    </div>
                </div>
                <div style="text-align:right;">
                    <strong style="color:#00f2fe; font-size:13.5px; display:block;">${rank.score}/${rank.max}</strong>
                    <small style="color:#94a3b8; font-size:11px; font-weight:600;">${rank.percentage}%</small>
                </div>
            </div>`;
    });
}

// ==========================================
// PART 4: CALENDAR ENGINE 
// ==========================================
async function loadCalendarEngine(studentClass) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getCalendarEvents`, { method: 'POST', body: JSON.stringify({}) });
        const result = await response.json();
        if (result.status === "success" && result.events) {
            monthEventsList = result.events.filter(e => e.targetClass.toLowerCase() === "all" || e.targetClass.toLowerCase() === studentClass.toLowerCase().trim());
            renderVisualCalendar();
        }
    } catch (err) { console.error(err); }
}

function renderVisualCalendar() {
    const dayGrid = document.getElementById("calendarDaysGrid");
    const monthTitle = document.getElementById("calendarMonthTitle");
    const agendaList = document.getElementById("agendaEventList");
    if (!dayGrid || !monthTitle || !agendaList) return;
    
    const now = new Date();
    const currentYear = now.getFullYear(); const currentMonth = now.getMonth(); 
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.innerText = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    dayGrid.innerHTML = ""; agendaList.innerHTML = "";
    for (let x = 0; x < firstDayIndex; x++) { dayGrid.innerHTML += `<div style="padding:10px; background: transparent;"></div>`; }
    
    let activeAgendaItemsHtml = "";
    for (let day = 1; day <= totalDays; day++) {
        const targetDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = monthEventsList.filter(e => {
            if (!e.date) return false;
            const parsedEventDate = new Date(e.date);
            if (isNaN(parsedEventDate.getTime())) return false; 
            return `${parsedEventDate.getFullYear()}-${String(parsedEventDate.getMonth() + 1).padStart(2, '0')}-${String(parsedEventDate.getDate()).padStart(2, '0')}` === targetDayStr;
        });

        let dayStyle = "padding:12px 8px; background:#121526; border-radius:8px; text-align:center; font-size:13px; font-weight:600; color:#cbd5e1; border:1px solid rgba(255,255,255,0.02); position:relative;";
        let statusDotHtml = "";
        if (day === now.getDate()) { dayStyle += "border-color: #00f2fe; background: rgba(0, 242, 254, 0.05); color:#fff;"; }
        
        if (dayEvents.length > 0) {
            let badgeColor = "#4facfe"; 
            if (dayEvents[0].type.toLowerCase() === "exam") badgeColor = "#f59e0b"; 
            if (dayEvents[0].type.toLowerCase() === "holiday") badgeColor = "#ef4444"; 
            dayStyle += `background: rgba(255,255,255,0.04);`;
            statusDotHtml = `<span style="width:5px; height:5px; background:${badgeColor}; border-radius:50%; position:absolute; bottom:4px; left:50%; transform:translateX(-50%); display:inline-block;"></span>`;
            dayEvents.forEach(ev => {
                activeAgendaItemsHtml += `<div style="border-left: 3px solid ${badgeColor}; background:rgba(255,255,255,0.02); padding:10px; border-radius:4px 8px 8px 4px; text-align: left; margin-bottom: 8px;"><span style="font-size:11px; color:${badgeColor}; font-weight:700; text-transform:uppercase;">Day ${day} • ${ev.type}</span><p style="font-size:13px; color:#f1f5f9; margin-top:2px; font-weight:500; line-height: 1.4;">${ev.title}</p></div>`;
            });
        }
        dayGrid.innerHTML += `<div style="${dayStyle}">${day}${statusDotHtml}</div>`;
    }
    agendaList.innerHTML = activeAgendaItemsHtml !== "" ? activeAgendaItemsHtml : `<p style="color:#64748b; font-size:13px; text-align:center; margin-top:40px;">No scheduled events or exams.</p>`;
}

// ==========================================
// PART 5: MATERIAL RENDERING LOOPS
// ==========================================
function renderResources(items) {
    const grid = document.getElementById("resourcesGrid");
    grid.innerHTML = "";
    const currentStudentClass = (sessionStorage.getItem("studentClass") || "").trim();
    const isCommerceEligible = ["11th", "12th"].includes(currentStudentClass);

    const filteredItems = items.filter(res => {
        if (["Accounts", "Economics", "B.St", "B.st"].includes(res.subject) && !isCommerceEligible) return false; 
        return true; 
    });
    
    if(filteredItems.length === 0) { grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;"><p>No study materials uploaded for your class yet.</p></div>`; return; }
    filteredItems.forEach((res, index) => {
        grid.innerHTML += `<div class="resource-card"><div><div class="card-header"><span class="subject-badge">${res.subject}</span><span class="type-badge">${res.type}</span></div><h4>${res.topic}</h4></div><button type="button" class="download-link" style="width:100%; border:none; cursor:pointer;" onclick="viewDocumentResource(${index})">View Material →</button></div>`;
    });
}

function filterSubject(subject) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnText = btn.innerText.trim().toLowerCase();
        if(subject === 'All' && btnText === 'all subjects') btn.classList.add('active'); 
        else if(btnText === subject.toLowerCase()) btn.classList.add('active'); 
        else btn.classList.remove('active'); 
    });
    renderResources(subject === 'All' ? allResources : allResources.filter(r => r.subject.toLowerCase() === subject.toLowerCase())); 
}