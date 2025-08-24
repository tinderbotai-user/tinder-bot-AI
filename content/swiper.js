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