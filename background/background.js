const DEFAULT_PAGE_SIZE = 100;   // how many profiles per fetch


function base64Matches(b64a, b64b) {
    if (!b64a || !b64b) return false;
    if (b64a.slice(0, 50) !== b64b.slice(0, 50)) return false;
    return b64a === b64b;
}

function findStoredProfile(profiles, profile) {
    return profiles.find((stored) => {
        if (stored.name !== profile.name || stored.age !== profile.age) return false;
        const storedPics = stored.pictures || [];
        const incomingPics = profile.pictures || [];
        for (const incomingPic of incomingPics) {
            for (const storedPic of storedPics) {
                if (base64Matches(incomingPic, storedPic)) return true;
            }
        }
        return false;
    });
}

async function checkProfile(profile) {
    const { visitedProfiles = [] } = await chrome.storage.local.get("visitedProfiles");
    const match = findStoredProfile(visitedProfiles, profile);
    return { exists: !!match, decision: match?.decision || null };
}

async function saveOrUpdateProfile(profile) {
    const key = "visitedProfiles";
    const { visitedProfiles = [] } = await chrome.storage.local.get(key);
    const match = findStoredProfile(visitedProfiles, profile);
    if (match) {
        // Update decision if changed; preserve urls/pictures already present
        match.decision = profile.decision ?? match.decision;
        match.urls = profile.urls?.length ? profile.urls : match.urls;
    } else {
        visitedProfiles.push(profile);
    }
    await chrome.storage.local.set({ [key]: visitedProfiles });
    return { result: match ? "Updated" : "Success" };
}

// ====== BOT STATUS ======
const AUTO_LIKE_STATUS = {
    NO_OPEN_TINDER_TAB: 0,
    MANUALLY_STOPPED: 1,
    OUT_OF_LIKES_STOPPED: 2,
    AUTO_CHAT_STOPPED: 3,
    ACTIVE: 4,
};
const AUTO_CHAT_STATUS = {
    NO_OPEN_TINDER_TAB: 0,
    MANUALLY_STOPPED: 1,
    CONDITION_STOPPED: 2,
    AUTO_LIKE_STOPPED: 3,
    ACTIVE: 4,
};

class BotHandler {
    constructor(state) {
        const s = state || {};
        this.autoLikeStatus = s.autoLikeStatus ?? AUTO_LIKE_STATUS.NO_OPEN_TINDER_TAB;
        this.autoChatStatus = s.autoChatStatus ?? AUTO_CHAT_STATUS.NO_OPEN_TINDER_TAB;
        this.timeOutOfLikesStoppedAutoLike = s.timeOutOfLikesStoppedAutoLike ?? null;
        this.activeTabId = s.activeTabId ?? null; // Only one tab allowed to run bots
    }

    toJSON() {
        return {
            autoLikeStatus: this.autoLikeStatus,
            autoChatStatus: this.autoChatStatus,
            timeOutOfLikesStoppedAutoLike: this.timeOutOfLikesStoppedAutoLike,
            activeTabId: this.activeTabId,
        };
    }

    async save() {
        await chrome.storage.local.set({ botHandlerConfiguration: this.toJSON() });
    }

    static async load() {
        const { botHandlerConfiguration = {} } = await chrome.storage.local.get("botHandlerConfiguration");
        return new BotHandler(botHandlerConfiguration);
    }

    async setActiveTab(tabId) {
        if (this.activeTabId && this.activeTabId !== tabId) {
            // Stop bots on the previous tab
            try {
                await chrome.tabs.sendMessage(this.activeTabId, { action: "stop_all" });
            } catch (e) {}
        }
        this.activeTabId = tabId;
        await this.save();
        this.broadcastStatus();
    }

    isAutoLikeRunning() {
        return this.autoLikeStatus === AUTO_LIKE_STATUS.ACTIVE;
    }

    isAutoChatRunning() {
        return this.autoChatStatus === AUTO_CHAT_STATUS.ACTIVE;
    }

    // Mutual exclusion: ensure only one bot can be ACTIVE
    async startAutoLike(tabId) {
        await this.setActiveTab(tabId);
        if (this.isAutoChatRunning()) this.autoChatStatus = AUTO_CHAT_STATUS.AUTO_LIKE_STOPPED;
        this.autoLikeStatus = AUTO_LIKE_STATUS.ACTIVE;
        await this.save();
        this.notifyTab("start_autolike");
        this.broadcastStatus();
    }

    async stopAutoLikeManually() {
        this.autoLikeStatus = AUTO_LIKE_STATUS.MANUALLY_STOPPED;
        if (this.autoChatStatus === AUTO_CHAT_STATUS.AUTO_LIKE_STOPPED) {
            // resume chat if it was paused by like
            this.autoChatStatus = AUTO_CHAT_STATUS.ACTIVE;
            this.notifyTab("start_autochat");
        }
        await this.save();
        this.notifyTab("stop_autolike");
        this.broadcastStatus();
    }

    async stopAutoLikeOutOfLikes() {
        this.autoLikeStatus = AUTO_LIKE_STATUS.OUT_OF_LIKES_STOPPED;
        await this.save();
        this.notifyTab("stop_autolike", { reason: "out_of_likes" });
        this.broadcastStatus();
    }

    async startAutoChat(tabId) {
        await this.setActiveTab(tabId);
        if (this.isAutoLikeRunning()) this.autoLikeStatus = AUTO_LIKE_STATUS.AUTO_CHAT_STOPPED;
        this.autoChatStatus = AUTO_CHAT_STATUS.ACTIVE;
        await this.save();
        this.notifyTab("start_autochat");
        this.broadcastStatus();
    }

    async stopAutoChatManually() {
        this.autoChatStatus = AUTO_CHAT_STATUS.MANUALLY_STOPPED;
        if (this.autoLikeStatus === AUTO_LIKE_STATUS.AUTO_CHAT_STOPPED) {
            this.autoLikeStatus = AUTO_LIKE_STATUS.ACTIVE;
            this.notifyTab("start_autolike");
        }
        await this.save();
        this.notifyTab("stop_autochat");
        this.broadcastStatus();
    }

    async stopAll() {
        if (this.activeTabId) {
            try { await chrome.tabs.sendMessage(this.activeTabId, { action: "stop_all" }); } catch (e) {}
        }
        this.autoLikeStatus = AUTO_LIKE_STATUS.MANUALLY_STOPPED;
        this.autoChatStatus = AUTO_CHAT_STATUS.MANUALLY_STOPPED;
        await this.save();
        this.broadcastStatus();
    }

    notifyTab(action, payload) {
        if (!this.activeTabId) return;
        try { chrome.tabs.sendMessage(this.activeTabId, { action, payload }); } catch (e) {}
    }

    broadcastStatus() {
        const status = {
            autoLikeStatus: this.autoLikeStatus,
            autoChatStatus: this.autoChatStatus,
            activeTabId: this.activeTabId,
            running: this.isAutoLikeRunning(),
        };
        chrome.runtime.sendMessage({ action: "status_changed", status });
    }
}

let handlerPromise = BotHandler.load();

// ====== MAIN LISTENER ======
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        const handler = await handlerPromise;

        switch (message.action) {
            case "fetchImage": {
                try {
                    const res = await fetch(message.url);
                    const blob = await res.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => sendResponse({ base64: reader.result });
                    reader.readAsDataURL(blob);
                } catch (err) {
                    sendResponse({ error: String(err?.message || err) });
                }
                return;
            }

            case "checkProfile": {
                const result = await checkProfile(message.profile);
                sendResponse(result);
                return;
            }

            case "saveProfile": {
                const result = await saveOrUpdateProfile(message.profile);
                sendResponse(result);
                handler.broadcastStatus();
                return;
            }

            // ===== TAB REGISTRATION & LOCKING =====
            case "register_tab": {
                const tabId = sender?.tab?.id || null;
                if (tabId) {
                    await handler.setActiveTab(tabId);
                }
                sendResponse({ ok: true, activeTabId: handler.activeTabId });
                return;
            }

            // ===== POPUP COMMANDS =====
            case "toggleAutoLike": {
                const tabId = handler.activeTabId || sender?.tab?.id || null;
                if (handler.isAutoLikeRunning()) {
                    await handler.stopAutoLikeManually();
                } else {
                    await handler.startAutoLike(tabId);
                }
                sendResponse({ running: handler.isAutoLikeRunning() });
                return;
            }

            case "getStats": {
                const { visitedProfiles = [] } = await chrome.storage.local.get("visitedProfiles");

                const total = visitedProfiles.length;

                // pagination params (safe defaults)
                const skip = Math.max(0, Number(message.skip) || 0);
                const topRaw = Number(message.top);
                const top = topRaw > 0 ? topRaw : DEFAULT_PAGE_SIZE;

                const page = visitedProfiles.slice(skip, skip + top);

                sendResponse({
                    running: handler.isAutoLikeRunning(),
                    count: total,                 // total profiles ever processed
                    matches: page,                // only this batch
                    skip,
                    top,
                    autoLikeStatus: handler.autoLikeStatus,
                    autoChatStatus: handler.autoChatStatus,
                    activeTabId: handler.activeTabId,
                });
                return;
            }

            // ===== CONTENT REPORTS =====
            case "out_of_likes": {
                await handler.stopAutoLikeOutOfLikes();
                sendResponse({ ok: true });
                return;
            }

            case "request_status": {
                sendResponse({
                    autoLikeStatus: handler.autoLikeStatus,
                    autoChatStatus: handler.autoChatStatus,
                    running: handler.isAutoLikeRunning(),
                    activeTabId: handler.activeTabId,
                });
                return;
            }

            default:
                sendResponse({ error: "Unknown action" });
                return;
        }
    })();
    return true; // keep channel open for async sendResponse
});