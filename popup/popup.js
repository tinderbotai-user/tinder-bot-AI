let currentMatchIndex = 0;
let matches = [];

// Update match display
function showMatch(index) {
    const matchImage = document.getElementById("match-image");
    matchImage.classList.remove( "match-image-nope", "match-image-like")
    if (!matches.length) {
        document.getElementById("match-name").innerText = "No matches yet";
        matchImage.src = "";
        document.getElementById("match-decision").innerText = "";
        return;
    }

    const match = matches[index];
    document.getElementById("match-name").innerText = `${match.name}, ${match.age}`;
    matchImage.src = match.urls?.[0] || "";
    matchImage.classList.add(match.decision === "dislike" ? "match-image-nope" : "match-image-like");
    document.getElementById("match-decision").innerText = `Decision: ${match.decision}`;
}


// Fetch data from background
function refreshData() {
    chrome.runtime.sendMessage({ action: "getStats" }, (response) => {
        if (!response) return;
        matches = response.matches || [];
        document.getElementById("profile-count").innerText = response.count || 0;
        if (currentMatchIndex >= matches.length) currentMatchIndex = matches.length - 1;
        if (currentMatchIndex < 0) currentMatchIndex = 0;
        showMatch(currentMatchIndex);
        displayAutoLikeButton(response.running);
    });
}
function displayAutoLikeButton(running) {
    if (running) {
        document.getElementById("toggle-autolike").innerText = "Pause Auto-Like";
    } else {
        document.getElementById("toggle-autolike").innerText = "Resume Auto-Like";
    }
}
// Toggle auto-like
document.getElementById("toggle-autolike").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggleAutoLike" }, (response) => {
        displayAutoLikeButton(response.running);
    });
});

// Cycle matches
document.getElementById("prev-match").addEventListener("click", () => {
    if (matches.length) {
        currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        showMatch(currentMatchIndex);
    }
});
document.getElementById("next-match").addEventListener("click", () => {
    if (matches.length) {
        currentMatchIndex = (currentMatchIndex + 1) % matches.length;
        showMatch(currentMatchIndex);
    }
});

// Tab initialization
function initTab() {
    // Tab logic
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active classes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Add active to selected tab
            button.classList.add('active');
            const target = document.getElementById(button.dataset.tab);
            target.classList.add('active');
        });
    });
}
async function sendToActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) return;

    // Your condition here (adjust as needed)
    if (tab.url.includes("https://tinder.com/")) {
        chrome.tabs.sendMessage(tab.id, {
            type: "popup_trigger",
            payload: { hello: "world" }
        }, (response) => {
            console.log("Response from content script:", response);
        });
    } else {
        console.log("URL does not match. Message not sent.");
    }
}


// Initial load
document.addEventListener('DOMContentLoaded', () => {
    refreshData();
    initTab();
});
