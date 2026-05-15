const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFoyYB5gN6mtwhdmaUFN5Yb_rx87JY63HtgXslfb_K3GsxconZ9VmVX0y_BW5Q7LaZag/exec";
let allResources = [];

document.addEventListener("DOMContentLoaded", () => {
    // GATEKEEPER SECURITY CHECK: Pull credentials established by index.js
    const sName = sessionStorage.getItem("studentName");
    const sClass = sessionStorage.getItem("studentClass");
    const sID = sessionStorage.getItem("studentID");

    if (!sID || !sClass) {
        alert("Access Denied. Please login through the portal.");
        window.location.href = "index.html";
        return;
    }
    
    // Display profile metrics on screen
    document.getElementById("welcomeName").innerText = `Hi, ${sName}!`;
    document.getElementById("studentMeta").innerText = `Class: ${sClass} | ID: ${sID}`;
    
    // INTERFACE MODIFICATION: Hide Commerce HTML filter buttons entirely for 9th & 10th graders
    const isCommerceEligible = ["11th", "12th"].includes(sClass.trim());
    if (!isCommerceEligible) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const btnText = btn.innerText.trim();
            if (["Accounts", "Economics", "B.st"].includes(btnText)) {
                btn.style.display = 'none';
            }
        });
    }

    loadDashboardContent(sClass);
});

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
        console.error("Failed to sync structural dashboard matrices:", err); 
        showToast("Error syncing dashboard records.", "error");
    }
}

// Resource Card Generation System with strict Grade Restriction Filters
function renderResources(items) {
    const grid = document.getElementById("resourcesGrid");
    grid.innerHTML = "";
    
    const currentStudentClass = (sessionStorage.getItem("studentClass") || "").trim();
    const isCommerceEligible = ["11th", "12th"].includes(currentStudentClass);

    // Filter array items dynamically based on grade authorization parameters
    const filteredItems = items.filter(res => {
        const isCommerceSubject = ["Accounts", "Economics", "B.St", "B.st"].includes(res.subject);
        if (isCommerceSubject && !isCommerceEligible) {
            return false; 
        }
        return true; 
    });
    
    if(filteredItems.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;"><p>No study materials uploaded for your class yet.</p></div>`;
        return;
    }
    
    // Render approved records cleanly
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
        
        if(subject === 'All' && btnText === 'all subjects') { 
            btn.classList.add('active'); 
        } else if(btnText === targetSubject) { 
            btn.classList.add('active'); 
        } else { 
            btn.classList.remove('active'); 
        }
    });
    
    if(subject === 'All') { 
        renderResources(allResources); 
    } else { 
        renderResources(allResources.filter(r => r.subject.toLowerCase() === subject.toLowerCase())); 
    }
}

document.getElementById("studentLogout").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
});

// Binary Document Stream Decoder and Virtual URL compiler
window.viewDocumentResource = function(index) {
    const targetResource = allResources[index];
    if (!targetResource || !targetResource.link) {
        alert("Resource data missing or corrupted.");
        return;
    }

    const rawDataString = targetResource.link;

    if (!rawDataString.startsWith("data:")) {
        window.open(rawDataString, '_blank');
        return;
    }

    try {
        const parts = rawDataString.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];

        const binaryString = window.atob(base64Data);
        const binaryLength = binaryString.length;
        const bytesArray = new Uint8Array(binaryLength);

        for (let i = 0; i < binaryLength; i++) {
            bytesArray[i] = binaryString.charCodeAt(i);
        }

        const fileBlob = new Blob([bytesArray], { type: mimeType });
        const virtualUrlPath = URL.createObjectURL(fileBlob);

        window.open(virtualUrlPath, '_blank');
    } catch (error) {
        alert("Failed to reconstruct file document stream.");
        console.error("Blob presentation processing crash:", error);
    }
};

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