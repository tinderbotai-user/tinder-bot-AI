let currentMatchIndex = 0;
let matches = [];

let skip = 0;
const PAGE_SIZE = 100;   // how many profiles per fetch
let totalCount = 0;

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
    totalCount = response.count || 0;

    document.getElementById("profile-count").innerText = totalCount;

    if (currentMatchIndex >= matches.length) currentMatchIndex = matches.length - 1;
    if (currentMatchIndex < 0) currentMatchIndex = 0;

    showMatch(currentMatchIndex);
    displayAutoLikeButton(response.running);
}

function refreshData() {
    chrome.runtime.sendMessage(
        { action: "getStats", top: PAGE_SIZE, skip },
        (response) => {
            if (!response) return;

            matches = response.matches || [];
            totalCount = response.count || 0;

            document.getElementById("profile-count").innerText = totalCount;

            if (currentMatchIndex >= matches.length) currentMatchIndex = matches.length - 1;
            if (currentMatchIndex < 0) currentMatchIndex = 0;

            showMatch(currentMatchIndex);
            displayAutoLikeButton(response.running);

            const pageInfo = document.getElementById("page-info");
            pageInfo.innerText = `${skip + 1}-${skip + matches.length} / ${totalCount}`;
        }
    );
}

function getLastPageSkip(total, pageSize) {
    if (total === 0) return 0;
    return Math.floor((total - 1) / pageSize) * pageSize;
}

// Toggle auto-like
document.getElementById("toggle-autolike").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggleAutoLike" }, (response) => {
        displayAutoLikeButton(response.running);
    });
});

// Cycle matches
document.getElementById("prev-match").addEventListener("click", () => {
    if (!matches.length) return;

    // Move inside current page
    if (currentMatchIndex > 0) {
        currentMatchIndex--;
        showMatch(currentMatchIndex);
        return;
    }

    // Beginning of page → go to previous page or wrap to last
    if (skip > 0) {
        skip = Math.max(0, skip - PAGE_SIZE);
        currentMatchIndex = PAGE_SIZE - 1;
    } else {
        // Wrap to last page
        skip = getLastPageSkip(totalCount, PAGE_SIZE);

        // On last page the count may be < PAGE_SIZE
        const remaining = totalCount - skip;
        currentMatchIndex = remaining - 1;
    }

    refreshData();
});

document.getElementById("next-match").addEventListener("click", () => {
    if (!matches.length) return;

    // Move inside current page
    if (currentMatchIndex < matches.length - 1) {
        currentMatchIndex++;
        showMatch(currentMatchIndex);
        return;
    }

    // End of page → go to next page or wrap to start
    const nextSkip = skip + PAGE_SIZE;

    if (nextSkip < totalCount) {
        skip = nextSkip;
        currentMatchIndex = 0;
    } else {
        // Wrap to first page
        skip = 0;
        currentMatchIndex = 0;
    }

    refreshData();
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
