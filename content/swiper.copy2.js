// === PROFILE EXTRACTION ===
async function getIdentifiers() {
    try {
        let nameSpans = document.querySelectorAll('span[itemprop="name"]');
        let ageSpans = document.querySelectorAll('span[itemprop="age"]');

        if (!nameSpans.length || !ageSpans.length) {
            throw new Error("Name or age spans not found");
        }

        // Handle index logic (Tinder's weird DOM changes after swipe)
        let currentNameIndex = nameSpans.length === 3 ? 1 : nameSpans.length - 1;
        let currentAgeIndex = ageSpans.length === 3 ? 1 : ageSpans.length - 1;

        let currentName = nameSpans[currentNameIndex]?.innerText || "";
        let currentAge = ageSpans[currentAgeIndex]?.innerText || "";

        let imageNumber = 0;
        let profilePictures = [];
        let fetchedImages = [];

        while (true) {
            let containers = document.querySelectorAll(`[id="carousel-item-${imageNumber}"]`);
            let profilePictureContainer = containers[1] ?? null;

            if (!profilePictureContainer || !profilePictureContainer.childNodes.length) {
                break;
            }

            let child = profilePictureContainer.childNodes[0];
            let bg = child?.style?.backgroundImage;

            if (!bg || bg === "none") break;

            let url = bg.slice(5, -2);
            profilePictures.push(url);

            // Fetch base64 via background to bypass CORS
            const base64 = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'fetchImage', url }, (response) => {
                    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                    if (response?.error) return reject(new Error(response.error));
                    resolve(response.base64);
                });
            });

            fetchedImages.push(base64);
            imageNumber++;
        }

        return {
            name: currentName,
            age: currentAge,
            pictures: fetchedImages,
            urls: profilePictures,
        };

    } catch (error) {
        console.error("Error extracting identifiers:", error);
        return null;
    }
}

// === BACKGROUND COMMUNICATION ===
async function checkAlreadyProposed(profile) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'checkProfile', profile }, response => {
            if (response?.error) reject(new Error(response.error));
            else resolve(response.matchData || null); // return match data if found
        });
    });
}

async function saveProfile(profile) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'saveProfile', profile }, response => {
            if (response?.error) reject(new Error(response.error));
            else resolve(response);
        });
    });
}

// === UI: OVERLAY CREATION ===
function showOverlay(message, color = "rgba(0,0,0,0.8)") {
    let overlay = document.getElementById("tinderbot-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "tinderbot-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "20px";
        overlay.style.left = "50%";
        overlay.style.transform = "translateX(-50%)";
        overlay.style.padding = "10px 20px";
        overlay.style.background = color;
        overlay.style.color = "#fff";
        overlay.style.fontSize = "16px";
        overlay.style.zIndex = 9999;
        overlay.style.borderRadius = "5px";
        overlay.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
        document.body.appendChild(overlay);
    }
    overlay.textContent = message;
    overlay.style.background = color;
}

// === MAIN LOGIC ===
let currentProfile = null;
let lastCheckMatched = null;

async function processProfile() {
    const identifiers = await getIdentifiers();
    if (!identifiers) {
        console.warn("Failed to get profile identifiers.");
        return;
    }

    currentProfile = {
        name: identifiers.name,
        age: identifiers.age,
        pictures: identifiers.pictures,
        result: null // to be set after click
    };

    const matchData = await checkAlreadyProposed(currentProfile);
    if (matchData) {
        lastCheckMatched = true;
        showOverlay(`ALREADY SEEN: ${matchData.name}, Result: ${matchData.result}`, "rgba(200,0,0,0.8)");
    } else {
        lastCheckMatched = false;
        showOverlay(`NEW PROFILE: ${currentProfile.name}`, "rgba(0,150,0,0.8)");
    }
}

// === LISTEN TO BUTTON CLICKS TO STORE RESULT ===
function attachButtonListeners() {
    const buttons = document.querySelectorAll("span.gamepad-icon-wrapper");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            let actionType = "unknown";
            if (btn.querySelector('[fill="var(--fill--gamepad-sparks-nope, none)"]')) actionType = "dislike";
            if (btn.querySelector('[fill="var(--fill--gamepad-sparks-like, none)"]')) actionType = "like";
            if (btn.querySelector('[fill="var(--fill--gamepad-sparks-super-like, none)"]')) actionType = "superlike";
            if (btn.querySelector('[fill="var(--fill--gamepad-sparks-super-like, none)"]')) actionType = "message";

            if (currentProfile && !lastCheckMatched) {
                currentProfile.result = actionType;
                saveProfile(currentProfile).catch(console.error);
            }

            setTimeout(processProfile, 1000);
        });
    });
}

// === INIT ===
function onLoad() {
    processProfile().catch(console.error);
    attachButtonListeners();
}

setTimeout(onLoad, 5000);



async function drawBase64Image(base64DataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            // If you want to check pixels, do it here
            resolve(canvas);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = base64DataUrl;
    });
}

// document.body.prepend(await drawBase64Image(b64))



// milena, 26
// https://images-ssl.gotinder.com/u/eZ24p4Q5X8YHgf5jXwUybW/jB5RkRQqHjGnEkRq7vrPZT.webp?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS9lWjI0cDRRNVg4WUhnZjVqWHdVeWJXLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTUzNzUyNTN9fX1dfQ__&Signature=iNYQBD0eDmFyCaLbedlmjd7YtVaWvPbedFIAfXEpbNY07H0QKu-AbEBbM8p12cocmSp6UJgv6wJx6nTGMypaExhSirR9rWblXTQQdhm9UzDx9UDebJRA5s3GGRST6w5h228ppdMsVMh96GHLHljDMeQGvoJ4eI3CMAXz-9~wFZsQNGjU1Cq84Fjm-kNOuQAWJuGH~VFI9tXJ3LKjfFww7QIOwQwPcxNr7QuxUk93kvmA8Pnwr3yxus74x8jJc5DEPbZBUlS9srGuP5S47RY4AfL85uzeQr2Ji4u24IUjLePxwZRxcbm26UbxsxPdYbYsAVYw~vqSNItbR5ef5WhRvw__&Key-Pair-Id=K368TLDEUPA6OI
// https://images-ssl.gotinder.com/u/eZ24p4Q5X8YHgf5jXwUybW/jB5RkRQqHjGnEkRq7vrPZT.webp?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS9lWjI0cDRRNVg4WUhnZjVqWHdVeWJXLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTUzNzUyNTN9fX1dfQ__&Signature=iNYQBD0eDmFyCaLbedlmjd7YtVaWvPbedFIAfXEpbNY07H0QKu-AbEBbM8p12cocmSp6UJgv6wJx6nTGMypaExhSirR9rWblXTQQdhm9UzDx9UDebJRA5s3GGRST6w5h228ppdMsVMh96GHLHljDMeQGvoJ4eI3CMAXz-9~wFZsQNGjU1Cq84Fjm-kNOuQAWJuGH~VFI9tXJ3LKjfFww7QIOwQwPcxNr7QuxUk93kvmA8Pnwr3yxus74x8jJc5DEPbZBUlS9srGuP5S47RY4AfL85uzeQr2Ji4u24IUjLePxwZRxcbm26UbxsxPdYbYsAVYw~vqSNItbR5ef5WhRvw__&Key-Pair-Id=K368TLDEUPA6OI


// Diosanny, 23
// https://images-ssl.gotinder.com/u/tscMvGWcqwWXGWVdVn8Afq/kWYyYnzGBSQutm7VWzhArs.webp?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS90c2NNdkdXY3F3V1hHV1ZkVm44QWZxLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTU0NDc4MzJ9fX1dfQ__&Signature=W6RyUiWHaGUkLHU1e~ysAYsGIKoQ~2Bt8paKjBNaFHzT8hQ~5SPp6eG2EvB3qruAqRdaiPwas8h2ik6rXa3cambIGNAWugr0QmDBvoMuSSoHJKGoJeUOkAMH3GDgzXN8d5Q~BZIYUfxRrmiiJOKBgvXBwrcIA3R-zHQeTHnLbmcjRT2FpRNrSuFpW52VVY0Z8c7BepJzqhqVQkr96XWzX7Thn7eCyZgLxY5hWOcvNKNmRJiMLm4q7BA8vO1r1tmN9D1smm4NNctoswEWQCjBNROqcPauJqDXNzi6vbb2APXR2cvI3is-KB5G1HPA2QNHl1LF2It91u3rxiQcuuX1ug__&Key-Pair-Id=K368TLDEUPA6OI
// https://images-ssl.gotinder.com/u/tscMvGWcqwWXGWVdVn8Afq/kWYyYnzGBSQutm7VWzhArs.webp?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS90c2NNdkdXY3F3V1hHV1ZkVm44QWZxLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3NTU0NDc4MzJ9fX1dfQ__&Signature=W6RyUiWHaGUkLHU1e~ysAYsGIKoQ~2Bt8paKjBNaFHzT8hQ~5SPp6eG2EvB3qruAqRdaiPwas8h2ik6rXa3cambIGNAWugr0QmDBvoMuSSoHJKGoJeUOkAMH3GDgzXN8d5Q~BZIYUfxRrmiiJOKBgvXBwrcIA3R-zHQeTHnLbmcjRT2FpRNrSuFpW52VVY0Z8c7BepJzqhqVQkr96XWzX7Thn7eCyZgLxY5hWOcvNKNmRJiMLm4q7BA8vO1r1tmN9D1smm4NNctoswEWQCjBNROqcPauJqDXNzi6vbb2APXR2cvI3is-KB5G1HPA2QNHl1LF2It91u3rxiQcuuX1ug__&Key-Pair-Id=K368TLDEUPA6OI