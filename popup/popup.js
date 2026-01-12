let currentMatchIndex = 0;
let matches = [];

function showMatch(index) {
    const matchImage = document.getElementById("match-image");
    matchImage.classList.remove("match-image-nope", "match-image-like");
    if (!matches.length) {
        document.getElementById("match-name").innerText = "No matches yet";
        matchImage.src = "";
        document.getElementById("match-decision").innerText = "";
        return;
    }
    const match = matches[index];
    document.getElementById("match-name").innerText = `${match.name}, ${match.age}`;
    matchImage.src = match.pictures?.[0] || "";
    // matchImage.src = match.urls?.[0] || ""; // URLs go down after a while
    matchImage.classList.add(match.decision === "dislike" ? "match-image-nope" : "match-image-like");
    document.getElementById("match-decision").innerText = `Decision: ${match.decision}`;
}

function displayAutoLikeButton(running) {
    document.getElementById("toggle-autolike").innerText = running ? "Pause Auto-Like" : "Resume Auto-Like";
}

function applyStats(response) {
    if (!response) return;
    matches = response.matches || [];
    document.getElementById("profile-count").innerText = response.count || 0;
    if (currentMatchIndex >= matches.length) currentMatchIndex = matches.length - 1;
    if (currentMatchIndex < 0) currentMatchIndex = 0;
    showMatch(currentMatchIndex);
    displayAutoLikeButton(response.running);
}

function refreshData() {
    chrome.runtime.sendMessage({ action: "getStats" }, (response) => applyStats(response));
}

// Toggle auto-like
document.getElementById("toggle-autolike").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggleAutoLike" }, (response) => {
        displayAutoLikeButton(response.running);
    });
});

// Cycle matches
document.getElementById("prev-match").addEventListener("click", () => {
    if (matches.length) { currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length; showMatch(currentMatchIndex); }
});
document.getElementById("next-match").addEventListener("click", () => {
    if (matches.length) { currentMatchIndex = (currentMatchIndex + 1) % matches.length; showMatch(currentMatchIndex); }
});

// Tabs
function initTab() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            button.classList.add('active');
            const target = document.getElementById(button.dataset.tab);
            target.classList.add('active');
        });
    });
}

// Live updates: listen to background broadcasts
chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === 'status_changed') {
        refreshData();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    refreshData();
    initTab();
});
