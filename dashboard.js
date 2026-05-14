const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWvJYEEx-fIt8_W78w8SWNC2g5z5EOVE8GodxXBJ5UlGtBRSfwwDigVLO1OwAbs03mOw/exec";
let allResources = [];

document.addEventListener("DOMContentLoaded", () => {
    const sessionData = sessionStorage.getItem("studentProfile");
    if (!sessionData) {
        alert("Access Denied. Please login through the portal.");
        window.location.href = "index.html";
        return;
    }
    
    const profile = JSON.parse(sessionData);
    document.getElementById("welcomeName").innerText = `Hi, ${profile.name}!`;
    document.getElementById("studentMeta").innerText = `Class: ${profile.className} | ID: ${profile.id}`;
    
    loadDashboardContent(profile.className);
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
    } catch(err) { console.error("Failed to sync structural dashboard matrices:", err); }
}
// Upgraded Resource Card Generation System with dynamic stream blob rendering
function renderResources(items) {
    const grid = document.getElementById("resourcesGrid");
    grid.innerHTML = "";
    
    if(items.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;"><p>No study materials uploaded for your class yet.</p></div>`;
        return;
    }
    
    items.forEach((res, index) => {
        // Generate card layout structure
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
        if(subject === 'All' && btn.innerText === 'All Subjects') { btn.classList.add('active'); } 
        else if(btn.innerText.toLowerCase() === subject.toLowerCase()) { btn.classList.add('active'); } 
        else { btn.classList.remove('active'); }
    });
    
    if(subject === 'All') { renderResources(allResources); } 
    else { renderResources(allResources.filter(r => r.subject.toLowerCase() === subject.toLowerCase())); }
}

document.getElementById("studentLogout").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
});
// Core Document Stream Compilation Runner Engine
window.viewDocumentResource = function(index) {
    const targetResource = allResources[index];
    if (!targetResource || !targetResource.link) {
        alert("Resource data missing or corrupted.");
        return;
    }

    const rawDataString = targetResource.link;

    // Condition A: If it's a standard web URL link, just open it normally
    if (!rawDataString.startsWith("data:")) {
        window.open(rawDataString, '_blank');
        return;
    }

    try {
        // Condition B: If it's stored text data, split the text data out of the header properties
        const parts = rawDataString.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];

        // Decode character arrays back into raw bytes
        const binaryString = window.atob(base64Data);
        const binaryLength = binaryString.length;
        const bytesArray = new Uint8Array(binaryLength);

        for (let i = 0; i < binaryLength; i++) {
            bytesArray[i] = binaryString.charCodeAt(i);
        }

        // Build a virtual clean PDF document blob pointer in browser space memory layers
        const fileBlob = new Blob([bytesArray], { type: mimeType });
        const virtualUrlPath = URL.createObjectURL(fileBlob);

        // Open the virtual tab safely without browser address bar blocks
        window.open(virtualUrlPath, '_blank');
    } catch (error) {
        alert("Failed to reconstruct file. The PDF string might have been clipped or too large for the cell.");
        console.error("Blob translation layout error details:", error);
    }
};
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
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