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
