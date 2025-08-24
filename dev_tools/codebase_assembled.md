The following codebase belongs to a Chrome browser extension.

## Extension manifest

```json
{
  "manifest_version": 3,
  "name": "TinderBot",
  "description": "Bot for Tinder",
  "version": "0.0.1",
  "permissions": [
    "storage",
    "unlimitedStorage",
    "scripting",
    "tabs",
    "activeTab",
    "webNavigation"
  ],
  "host_permissions": [
    "https://images-ssl.gotinder.com/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "images/png/tinder_bot_logo_2.png",
      "32": "images/png/tinder_bot_logo_2.png",
      "48": "images/png/tinder_bot_logo_2.png",
      "128": "images/png/tinder_bot_logo_2.png"
    },
    "icons": {
      "16": "images/png/tinder_bot_logo_2.png",
      "32": "images/png/tinder_bot_logo_2.png",
      "48": "images/png/tinder_bot_logo_2.png",
      "128": "images/png/tinder_bot_logo_2.png"
    }
  },
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://tinder.com/app/recs"
      ],
      "js": [
        "content/swiper.js",
        "content/chatter.js"
      ]
    }
  ]
}

```

## Extension popup

Popup HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tinder BOT</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<h1>Tinder BOT</h1>

<div class="tabs">
    <button class="tab-button active" data-tab="autolike-tab">Auto-Like</button>
    <button class="tab-button" data-tab="autochat-tab">Auto-Chat</button>
    <button class="tab-button" data-tab="ai-tab">AI</button>
</div>

<div class="tab-content active" id="autolike-tab">
    <div id="controls">
        <button id="toggle-autolike" class="wide-button">Pause Auto-Like</button>
        <div>Total Profiles Processed: <span id="profile-count">0</span></div>
    </div>

    <hr>

    <div id="matches-section">
        <h2>Previous Matches</h2>
        <div id="match-viewer">
            <div id="match-name">No matches yet</div>
            <img id="match-image" class="match-image" src="" alt="Profile picture">
            <div id="match-decision"></div>
        </div>
        <div>
            <button id="prev-match">Prev</button>
            <button id="next-match" style="float: right;">Next</button>
        </div>
    </div>
</div>

<div class="tab-content" id="autochat-tab">
    <h2>Auto-Chat</h2>
    <p>Coming soon: Automatically respond to matches with pre-configured messages.</p>
</div>

<div class="tab-content" id="ai-tab">
    <h2>AI</h2>
    <p>Coming soon: AI-generated message suggestions and match analysis.</p>
</div>

<script src="popup.js"></script>
</body>
</html>

```

Popup CSS file:

```css
:root {
    --primary-color: #f44336;
    --primary-color-dark: #d32f2f;
    --match-color: #5dea7e;
    --tab-background: #919191;
    --tab-active-color: #ffffff;
    --button-text-color: #ffffff;
    --text-color: #000000;
    --border-radius: 5px;
    --font-family: Arial, sans-serif;
}

body {
    font-family: var(--font-family);
    color: var(--text-color);
    width: 300px;
    padding: 10px;
}

#controls {
    margin-bottom: 10px;
}

h1 {
    text-align: center;
}

button {
    margin: 5px;
    padding: 6px 10px;
    background: var(--primary-color);
    color: var(--button-text-color);
    border: none;
    cursor: pointer;
    border-radius: var(--border-radius);
}
button:hover {
    background: var(--primary-color-dark);
}

#match-viewer {
    text-align: center;
    margin-top: 10px;
}

#match-name {
    font-weight: bold;
    margin-bottom: 5px;
}

.match-image-like {
    border: 3px solid  var(--match-color);
    border-radius: var(--border-radius);
}
.match-image-nope {
    border: 3px solid var(--primary-color);
    border-radius: var(--border-radius);
}

.wide-button {
    width: 100%;
    margin: 5px 0;
    padding: 10px;
}
.match-image {
    max-width:100%;
    max-height:200px;
    width: 160px;
    height: 200px;
    display: inline-block;
}
/* Tab navigation */
.tabs {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}
.tab-button {
    flex: 1;
    padding: 8px;
    background: var(--tab-background);
    border: none;
    cursor: pointer;
    font-weight: bold;
    border-radius: var(--border-radius) var(--border-radius) 0 0;
    margin-right: 2px;
    color: var(--tab-active-color);
    transition: background 0.2s ease;
}
.tab-button:first-child {
    margin-left: 0;
}
.tab-button:last-child {
    margin-right: 0;
}
.tab-button.active {
    background: var(--primary-color);
    color: var(--button-text-color);
}

.tab-content {
    display: none;
    border-top: 2px solid var(--primary-color);
    padding-top: 10px;
}
.tab-content.active {
    display: block;
}

```

Popup JS file:

```js
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

```

## Background script

Background JS file:

```js
// ====== Storage utility functions ======
function base64Matches(b64a, b64b) {
    if (!b64a || !b64b) return false;
    if (b64a.slice(0, 50) !== b64b.slice(0, 50)) return false;
    return b64a === b64b;
}

function checkProfile(profile, sendResponse) {
    chrome.storage.local.get('visitedProfiles').then(result => {
        const profiles = result.visitedProfiles || [];
        const exists = profiles.some(storedProfile => {
            if (storedProfile.name !== profile.name || storedProfile.age !== profile.age) {
                return false;
            }
            const storedPics = storedProfile.pictures || [];
            const incomingPics = profile.pictures || [];
            for (const incomingPic of incomingPics) {
                for (const storedPic of storedPics) {
                    if (base64Matches(incomingPic, storedPic)) {
                        return true;
                    }
                }
            }
            return false;
        });

        sendResponse({ exists });
    });
}

function saveProfile(profile, sendResponse) {
    chrome.storage.local.get('visitedProfiles').then(result => {
        const profiles = result.visitedProfiles || [];
        const exists = profiles.some(storedProfile => {
            if (storedProfile.name !== profile.name || storedProfile.age !== profile.age) {
                return false;
            }
            const storedPics = storedProfile.pictures || [];
            const incomingPics = profile.pictures || [];
            for (const incomingPic of incomingPics) {
                for (const storedPic of storedPics) {
                    if (base64Matches(incomingPic, storedPic)) {
                        return true;
                    }
                }
            }
            return false;
        });

        if (!exists) {
            profiles.push(profile);
            chrome.storage.local.set({ visitedProfiles: profiles }).then(() => {
                console.log('Saved new profile:', profile);
                sendResponse({ result: 'Success', message: 'Profile saved' });
            });
        } else {
            sendResponse({ result: 'Exists', message: 'Profile already saved' });
        }
    });
}

// ====== CONTROL STATE ======
let autoLikeRunning = true;

// Both bots have 4 termination reasons
let AUTO_LIKE_STATUS = {
    NO_OPEN_TINDER_TAB: 0, // Stopped because there are no open Tinder tab
    MANUALLY_STOPPED: 1, // Stopped manually until the user reactivate it
    OUT_OF_LIKES_STOPPED: 2, // Stopped temporarily until likes are refilled
    AUTO_CHAT_STOPPED: 3, // Stopped temporarily while auto-chat is active
    ACTIVE: 4,
}
let AUTO_CHAT_STATUS = {
    NO_OPEN_TINDER_TAB: 0, // Stopped because there are no open Tinder tab
    MANUALLY_STOPPED: 1, // Stopped manually until the user reactivate it
    CONDITION_STOPPED: 2, // Maybe we can add LLM-controlled conditions (e.g. asks if the match is willing to date)
    // This state could also handle case where the user does not pay subscriptions
    AUTO_LIKE_STOPPED: 3, // Stopped temporarily while auto-like is active
    ACTIVE: 4,
}

class BotHandler {
    constructor(autoLikeStatus, autoChatStatus, timeOutOfLikesStoppedAutoLike, activeTabId) {
        this.autoLikeStatus = autoLikeStatus;
        this.autoChatStatus = autoChatStatus;
        this.timeOutOfLikesStoppedAutoLike = timeOutOfLikesStoppedAutoLike;
        this.activeTabId = activeTabId;
    }

    checkAndTerminateOtherTabs(tabId, afterTerminated=() => {}){
        if(this.activeTabId === null || this.activeTabId === tabId) {
            this.activeTabId = tabId;
            afterTerminated();
        } else {
            // send message to active tab id to stop every bot
            chrome.tabs.sendMessage(this.activeTabId, {
                action: "stop_all"
            }, (response) => {
                this.activeTabId = tabId;
                afterTerminated(response);
            });
        }

    }

    onStatusChange(callback=() => {}){
        chrome.tabs.sendMessage(this.activeTabId, {
            action: "status_changed"
        }, (response) => {
            callback(response);
        });
    }

    // Status change logic

    startAutoLike(tabId){
        this.checkAndTerminateOtherTabs(tabId, () => {
            if (this.autoChatStatus === AUTO_CHAT_STATUS.ACTIVE) this.autoChatStatus = AUTO_CHAT_STATUS.AUTO_LIKE_STOPPED;
            this.autoLikeStatus = AUTO_LIKE_STATUS.ACTIVE;
            this.onStatusChange()
        })
    }

    stopAutoLikeOutOfLikes(tabId){
        this.autoLikeStatus = AUTO_LIKE_STATUS.OUT_OF_LIKES_STOPPED;
        if (this.autoChatStatus === AUTO_CHAT_STATUS.AUTO_LIKE_STOPPED) {
            //if we previously interrupted auto-chat to auto-like, restart auto-chat
            this.startAutoChat(tabId);
        } else {
            this.onStatusChange()
        }
    }

    stopAutoLikeManually(tabId){
        this.autoLikeStatus = AUTO_LIKE_STATUS.MANUALLY_STOPPED;
        if (this.autoChatStatus === AUTO_CHAT_STATUS.AUTO_LIKE_STOPPED) {
            //if we previously interrupted auto-chat to auto-like, restart auto-chat
            this.startAutoChat(tabId);
        } else {
            this.onStatusChange()
        }
    }

    startAutoChat(tabId){
        this.checkAndTerminateOtherTabs(tabId, () => {
            if (this.autoLikeStatus === AUTO_LIKE_STATUS.ACTIVE) this.autoLikeStatus = AUTO_LIKE_STATUS.AUTO_CHAT_STOPPED;
            this.autoChatStatus = AUTO_CHAT_STATUS.ACTIVE;
            this.onStatusChange()
        })
    }

    // save and load to/from storage

    saveToStorage(){
        const botHandlerStatus = {botHandlerConfiguration: this};
        chrome.storage.local.set(botHandlerStatus).then(() => {
            console.log('Saved bot handler status:', botHandlerStatus);
        });
    }

    static async initFromStorage(){
        let botHandlerConfiguration = await chrome.storage.local.get('botHandlerConfiguration')
        botHandlerConfiguration = botHandlerConfiguration.botHandlerConfiguration || {};
        let autoLikeStatus = botHandlerConfiguration.autoLikeStatus || AUTO_LIKE_STATUS.NO_OPEN_TINDER_TAB;
        let autoChatStatus = botHandlerConfiguration.autoChatStatus || AUTO_CHAT_STATUS.NO_OPEN_TINDER_TAB;
        let timeOutOfLikesStoppedAutoLike = botHandlerConfiguration.timeOutOfLikesStoppedAutoLike || null;
        let activeTabId = botHandlerConfiguration.activeTabId || null;
        return new BotHandler(autoLikeStatus, autoChatStatus, timeOutOfLikesStoppedAutoLike, activeTabId);
    }
}

// ====== MAIN LISTENER ======
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetchImage") {
        fetch(message.url)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ base64: reader.result });
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => sendResponse({ error: err.message }));
        return true;

    } else if (message.action === "checkProfile") {
        checkProfile(message.profile, sendResponse);
        return true;

    } else if (message.action === "saveProfile") {
        saveProfile(message.profile, sendResponse);
        return true;

        // ====== POPUP ACTIONS ======
    } else if (message.action === "toggleAutoLike") {
        autoLikeRunning = !autoLikeRunning;
        sendResponse({ running: autoLikeRunning });
        return true;

    } else if (message.action === "getStats") {
        chrome.storage.local.get('visitedProfiles').then(result => {
            const profiles = result.visitedProfiles || [];
            sendResponse({
                running: autoLikeRunning,
                count: profiles.length,
                matches: profiles
            });
        });
        return true;

    } else {
        sendResponse({ error: "Unknown action" });
    }
});

```

## Content scripts

Swiper JS file:

```js
// === constants ===
const NEXT_PROFILE_DELAY = 1000;
const INITIAL_PROFILE_DELAY = 5000;
const MIN_AUTOLIKE_TIMEOUT = 3000;
const MEAN_AUTOLIKE_DELAY = 2000;
const STD_AUTOLIKE_DELAY = 2000;
const RESUME_CHECK_INTERVAL = 1000;

const LIKE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-like, none)"]';
const NOPE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-nope, none)"]';
const SUPERLIKE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-super-like, none)"]';
const MESSAGE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-super-like, none)"]';
const SUBSCRIBE_POPUP_SELECTOR = 'div.StretchedBox.CenterAlign > div[role="dialog"]';

// === Utility ===
function gaussianRandom(mean = 0, stdev = 1) {
    let u = 1 - Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}
// === Overlay ===
function showOverlay(profile, previousDecision, countdown = null, stopped=false) {
    let overlay = document.getElementById("tinder-auto-like-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "tinder-auto-like-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "10px";
        overlay.style.right = "50%";
        overlay.style.zIndex = "999999";
        overlay.style.background = "rgba(0,0,0,0.8)";
        overlay.style.color = "#fff";
        overlay.style.padding = "10px";
        overlay.style.borderRadius = "8px";
        overlay.style.fontFamily = "Arial, sans-serif";
        document.body.appendChild(overlay);
    }
    const countdownString = countdown > 0 ? countdown.toFixed(1) +"s": "NOW";
    overlay.innerHTML = `
        <div><strong>${profile.name}, ${profile.age}</strong></div>
        ${previousDecision ? `<div>Previously: ${previousDecision}</div>` : `<div>New profile</div>`}
        ${countdown !== null ? `<div>Auto-like in: ${countdownString}</div>` : ""}
        ${stopped ? `<div>Auto-like stopped</div>` : ""}
    `;
}

// === Click helpers ===
function clickLike() {
    document.querySelector(LIKE_BUTTON_QUERY_SELECTOR)?.closest("button")?.click();
}

function clickNope() {
    document.querySelector(NOPE_BUTTON_QUERY_SELECTOR)?.closest("button")?.click();
}

// === Get identifiers ===
async function getIdentifiers() {
    try {
        let nameSpans = document.querySelectorAll('span[itemprop="name"]');
        let ageSpans = document.querySelectorAll('span[itemprop="age"]');
        if (!nameSpans.length || !ageSpans.length) throw new Error("Name or age spans not found");

        let idxName = nameSpans.length === 3 ? 1 : nameSpans.length - 1;
        let idxAge = ageSpans.length === 3 ? 1 : ageSpans.length - 1;

        let name = nameSpans[idxName]?.innerText || "";
        let age = ageSpans[idxAge]?.innerText || "";

        let pictures = [];
        let urls = [];
        let imageNumber = 0;

        while (true) {
            let container = document.querySelectorAll(`[id="carousel-item-${imageNumber}"]`)[1] ?? null;
            if (!container?.childNodes.length) break;

            let bg = container.childNodes[0]?.style?.backgroundImage;
            if (!bg || bg === "none") break;

            let url = bg.slice(5, -2);
            urls.push(url);

            const base64 = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: "fetchImage", url }, (response) => {
                    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                    if (response?.error) return reject(new Error(response.error));
                    resolve(response.base64);
                });
            });

            pictures.push(base64);
            imageNumber++;
        }

        return { name, age, pictures, urls };
    } catch (e) {
        console.error("Error extracting identifiers:", e);
        return null;
    }
}

// === Messaging helpers ===
function checkAlreadyProposed(profile) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "checkProfile", profile }, (response) => {
            if (response?.error) reject(new Error(response.error));
            else resolve(response);
        });
    });
}

function saveProfile(profile) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "saveProfile", profile }, (response) => {
            if (response?.error) reject(new Error(response.error));
            else resolve(response);
        });
    });
}

async function checkIsRunning(){
    return (await chrome.runtime.sendMessage({ action: "getStats" })).running;
}


// === Main logic ===
let lastActionTime = null;
let autoMatchTimeout = null;
let countdownInterval = null;
let resumeInterval = null;
let autoCancelled = false;

async function main() {

    autoCancelled = false;

    const profileData = await getIdentifiers();
    if (!profileData) return;

    const { exists, decision } = await checkAlreadyProposed(profileData);

    if (await checkManualStop(profileData, exists, decision)) return;

    if (exists) {
        showOverlay(profileData, decision, null);
        clickNope();
        lastActionTime = Date.now();
        setTimeout(main, NEXT_PROFILE_DELAY);
        return;
    }

    if (lastActionTime === null) lastActionTime = Date.now();

    const now = Date.now();
    const minDelay = MIN_AUTOLIKE_TIMEOUT - (now - lastActionTime);

    let salt = -1;
    while (salt <= 0) {
        salt = gaussianRandom(MEAN_AUTOLIKE_DELAY, STD_AUTOLIKE_DELAY);
    }

    const delay = Math.max(minDelay, MIN_AUTOLIKE_TIMEOUT) + salt;
    console.log("Initiating a " + delay + " ms timer before auto-like for: ", profileData)
    let countdown = delay / 1000;
    if(countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        showOverlay(profileData, null, countdown);
        countdown -= 0.1;
    }, 100);

    if(autoMatchTimeout) clearTimeout(autoMatchTimeout);
    autoMatchTimeout = setTimeout(async () => {
        if (autoCancelled) return; // prevent late execution
        if (await checkManualStop(profileData, exists, decision)) return;
        clearInterval(countdownInterval);
        clickLike();
        lastActionTime = Date.now();
        setTimeout(async () => {
            if (await checkManualStop(profileData, exists, decision)) return;
            if (document.querySelector(SUBSCRIBE_POPUP_SELECTOR)) {
                console.log("Subscription popup detected, not saving last profile nor restarting the cycle");
                cancelAuto();
            } else {
                await saveProfile({ ...profileData, decision: "like" });
                main().then();
            }
        }, NEXT_PROFILE_DELAY);

    }, delay);
}

function cancelAuto() {
    autoCancelled = true;
    clearTimeout(autoMatchTimeout);
    clearInterval(countdownInterval);
    resumeInterval = setInterval(checkManualResume, RESUME_CHECK_INTERVAL)
}

function resumeAuto() {
    clearInterval(resumeInterval);
    if(!autoCancelled) return
    autoCancelled = false;
    main().then();
}


async function checkManualStop(profileData, exists, decision) {
    if (!(await checkIsRunning())) {
        if (exists) {
            showOverlay(profileData, decision, null, true);
        } else {
            showOverlay(profileData, null, null, true);
        }
        console.log("Running is false, stopping the flow")
        cancelAuto();
        return true;
    } else {
        return false;
    }
}

async function checkManualResume() {
    const isRunning = await checkIsRunning();
    console.log("Checking for resume button press. Pressed: ", isRunning)
    if (isRunning) resumeAuto();
}


// === Manual button hook ===
function hookButtons() {
    document.querySelectorAll("span.gamepad-icon-wrapper").forEach((btn) => {
        btn.onclick = async () => {
            cancelAuto();

            let actionType = null;
            if (btn.querySelector(NOPE_BUTTON_QUERY_SELECTOR)) actionType = "dislike";
            if (btn.querySelector(LIKE_BUTTON_QUERY_SELECTOR)) actionType = "like";
            if (btn.querySelector(SUPERLIKE_BUTTON_QUERY_SELECTOR)) actionType = "superlike";
            if (btn.querySelector(MESSAGE_BUTTON_QUERY_SELECTOR)) actionType = "message";

            const profileData = await getIdentifiers();
            const stopped = !(await checkIsRunning());
            showOverlay(profileData, actionType, null, stopped);
            await saveProfile({ ...profileData, decision: actionType });

            lastActionTime = Date.now();
            setTimeout(main, NEXT_PROFILE_DELAY);
        };
    });
}

// === Init ===
setTimeout(() => {
    hookButtons();
    main().then();
}, INITIAL_PROFILE_DELAY);

// Message handling for stop and resume  auto-like
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "popup_trigger") {
        console.log("Message received in content script:", message.payload);
        // Handle the event here
    }
});
```

Chatter JS file:

```js

// === constants ===
const TAB_CHANGE_DELAY = 2000;
const CHAT_CHANGE_DELAY = 3500;

const MATCHES_MESSAGES_TABS_QUERY_SELECTOR = 'div[role="tablist"]>div>button[role="tab"]';
const MATCHES_PROFILE_QUERY_SELECTOR = "a.matchListItem";
const MESSAGES_PROFILE_QUERY_SELECTOR = "a.messageListItem";
const MESSAGE_QUERY_SELECTOR = 'div[role="article"]';
const MESSAGE_INFO_QUERY_SELECTOR = "div.msgHelper";
const MESSAGE_TIME_QUERY_SELECTOR = "time[datetime]";
const MESSAGE_TEXT_QUERY_SELECTOR = "span.text";
const MESSAGE_SENDER_QUERY_SELECTOR = "strong.Hidden";


// === Utility ===
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === Get chats ===
function extractNewChats() {
    return Array.from(document.querySelectorAll(MATCHES_PROFILE_QUERY_SELECTOR)).map((el) => {
        return { name: el.childNodes[0].childNodes[0].ariaLabel, chat: [] }
    })
}

async function extractStartedChats() {
    let elements = Array.from(document.querySelectorAll(MESSAGES_PROFILE_QUERY_SELECTOR));
    let chats = elements.map((el) => {
        return { name: el.ariaLabel }
    });
    for(let chatIdx in chats) {
        elements = Array.from(document.querySelectorAll(MESSAGES_PROFILE_QUERY_SELECTOR));// Refresh
        elements[chatIdx].click();
        await sleep(CHAT_CHANGE_DELAY)
        chats[chatIdx].chat = Array.from(document.querySelectorAll(MESSAGE_QUERY_SELECTOR)).map((el) => {
            let msgHelper = el.querySelector(MESSAGE_INFO_QUERY_SELECTOR);
            return {
                time: msgHelper.querySelector(MESSAGE_TIME_QUERY_SELECTOR).dateTime,
                content: msgHelper.querySelector(MESSAGE_TEXT_QUERY_SELECTOR).innerText,
                sender: msgHelper.querySelector(MESSAGE_SENDER_QUERY_SELECTOR).innerText,
            }
        });
    }
    return chats;
}


// === Main logic ===
let chats = [];

async function extractChats() {
    let matchesMessagesTab = document.querySelectorAll(MATCHES_MESSAGES_TABS_QUERY_SELECTOR)

    let isMatchesTabOpen = matchesMessagesTab[0].ariaSelected;
    let isMessagesTabOpen = matchesMessagesTab[1].ariaSelected;

    if(isMatchesTabOpen !== 'true') {
        console.log("Matches tab is closed, opening")
        matchesMessagesTab[0].click();
        await sleep(TAB_CHANGE_DELAY)
        console.log("Matches tab is now open")
    }
    chats.push(...extractNewChats());
    console.log("Extracted new chats, now extracting started chats")
    if(isMessagesTabOpen !== 'true') {
        console.log("Message tab is closed, opening")
        matchesMessagesTab[1].click();
        await sleep(TAB_CHANGE_DELAY)
        console.log("Message tab is now open")
    }
    chats.push(...(await extractStartedChats()));
    console.log("Extracted started chats, extraction complete")


}


```