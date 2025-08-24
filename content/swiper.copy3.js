// === constants ===
const NEXT_PROFILE_DELAY = 1000; // the time it takes to show the next candidate profile
const INITIAL_PROFILE_DELAY = 5000; // the time it takes to show the first candidate profile
const MIN_AUTOLIKE_TIMEOUT = 3000;
const MEAN_AUTOLIKE_DELAY = 2000;
const STD_AUTOLIKE_DELAY = 2000;

const LIKE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-like, none)"]';
const NOPE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-nope, none)"]';
const SUPERLIKE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-super-like, none)"]';
const MESSAGE_BUTTON_QUERY_SELECTOR = '[fill="var(--fill--gamepad-sparks-super-like, none)"]';


// === Utility: Gaussian random generator ===
function gaussianRandom(mean = 0, stdev = 1) {
    let u = 1 - Math.random(); // Converting [0,1) to (0,1]
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

// === DOM helper ===
function xpathExists(xpath) {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue !== null;
}

// === Overlay ===
function showOverlay(profile, previousDecision, countdown = null) {
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

    overlay.innerHTML = `
        <div><strong>${profile.name}, ${profile.age}</strong></div>
        ${previousDecision ? `<div>Previously: ${previousDecision}</div>` : `<div>New profile</div>`}
        ${countdown !== null ? `<div>Auto-like in: ${countdown.toFixed(1)}s</div>` : ""}
    `;
}

// === Tinder button click helper ===
function clickLike() {
    const likeBtn = document.querySelector(LIKE_BUTTON_QUERY_SELECTOR)?.closest("button");
    if (likeBtn) {
        console.log("CLICK LIKE");
        likeBtn.click();
    }//
}
function clickNope() {
    const nopeBtn = document.querySelector(NOPE_BUTTON_QUERY_SELECTOR)?.closest("button");
    if (nopeBtn) {
        console.log("CLICK NOPE");
        nopeBtn.click();
    }//
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

        let imageNumber = 0;
        let pictures = [];
        let urls = [];

        while (true) {
            let containers = document.querySelectorAll(`[id="carousel-item-${imageNumber}"]`);
            let container = containers[1] ?? null;
            if (!container || !container.childNodes.length) break;

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

// === Check & Save ===
async function checkAlreadyProposed(profile) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "checkProfile", profile }, (response) => {
            if (response?.error) reject(new Error(response.error));
            else resolve(response);
        });
    });
}
async function saveProfile(profile) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "saveProfile", profile }, (response) => {
            if (response?.error) reject(new Error(response.error));
            else resolve(response);
        });
    });
}
async function rollbackLastProfile() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "rollbackLastProfile" }, (response) => {
            resolve(response);
        });
    });
}

// === Main Swiper Logic ===
let lastActionTime = null;
let autoMatchTimeout = null;

async function main() {
    const profileData = await getIdentifiers();
    if (!profileData) return;

    const { exists, decision } = await checkAlreadyProposed(profileData);

    if (exists) {
        showOverlay(profileData, decision, null);
        clickNope();
        setTimeout(main, NEXT_PROFILE_DELAY);
        lastActionTime = Date.now();
    } else {
        if(lastActionTime === null) lastActionTime = Date.now();
        // Decide delay
        const now = Date.now();

        const minDelay = MIN_AUTOLIKE_TIMEOUT - (now - lastActionTime);
        let salt = -1;
        while (salt < 0) salt = gaussianRandom(MEAN_AUTOLIKE_DELAY, STD_AUTOLIKE_DELAY);
        const delay = minDelay + salt; // mean=5s, stdev=1s
        console.log("delay:", delay,"minDelay:", minDelay, "Salt:", salt)
        // const delay = Math.max(minDelay, gaussianRandom(5000, 1000)); // mean=5s, stdev=1s

        let countdown = delay / 1000;
        const timer = setInterval(() => {
            showOverlay(profileData, null, countdown);
            countdown -= 0.1;
        }, 100);

        autoMatchTimeout = setTimeout(async () => {
            clearInterval(timer);
            // Check if subscription popup opened
            if (xpathExists('//div[contains(@class,"subscription")]')) {
                console.warn("Subscription popup detected, rolling back last profile...");
                await rollbackLastProfile();
                return;
            }
            clickLike();
            await saveProfile({ ...profileData, decision: "like" });

            setTimeout(main, NEXT_PROFILE_DELAY);
            lastActionTime = Date.now();
        }, delay);
    }
}

// === Init ===
function hookButtons() {
    const buttons = document.querySelectorAll("span.gamepad-icon-wrapper");
    buttons.forEach((btn) => {
        btn.onclick = async () => {
            // manual decision (user pressed like/nope/superlike/message before the script could do it)
            let actionType = null;
            if (btn.querySelector(NOPE_BUTTON_QUERY_SELECTOR)) actionType = "dislike";
            if (btn.querySelector(LIKE_BUTTON_QUERY_SELECTOR)) actionType = "like";
            if (btn.querySelector(SUPERLIKE_BUTTON_QUERY_SELECTOR)) actionType = "superlike";
            if (btn.querySelector(MESSAGE_BUTTON_QUERY_SELECTOR)) actionType = "message";
            if(autoMatchTimeout !== null) clearTimeout(autoMatchTimeout);
            const profileData = await getIdentifiers();
            showOverlay(profileData, actionType, null);
            await saveProfile({ ...profileData, decision: actionType });
            setTimeout(main, NEXT_PROFILE_DELAY);
            lastActionTime = Date.now();
        };
    });
}

setTimeout(() => {
    hookButtons();
    main();
}, INITIAL_PROFILE_DELAY);
