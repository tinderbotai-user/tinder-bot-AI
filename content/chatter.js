(function () {
    // Only on messages/matches pages
    if (!/\/app\/(matches|messages)/.test(location.pathname)) return;

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

    function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

    function extractNewChats() {
        return Array.from(document.querySelectorAll(MATCHES_PROFILE_QUERY_SELECTOR)).map((el) => {
            return { name: el.childNodes[0]?.childNodes?.[0]?.ariaLabel || "", chat: [] };
        });
    }

    async function extractStartedChats() {
        let elements = Array.from(document.querySelectorAll(MESSAGES_PROFILE_QUERY_SELECTOR));
        let chats = elements.map((el) => ({ name: el.ariaLabel }));
        for (let chatIdx = 0; chatIdx < chats.length; chatIdx++) {
            elements = Array.from(document.querySelectorAll(MESSAGES_PROFILE_QUERY_SELECTOR));
            elements[chatIdx].click();
            await sleep(CHAT_CHANGE_DELAY);
            chats[chatIdx].chat = Array.from(document.querySelectorAll(MESSAGE_QUERY_SELECTOR)).map((el) => {
                let msgHelper = el.querySelector(MESSAGE_INFO_QUERY_SELECTOR);
                return {
                    time: msgHelper?.querySelector(MESSAGE_TIME_QUERY_SELECTOR)?.dateTime,
                    content: msgHelper?.querySelector(MESSAGE_TEXT_QUERY_SELECTOR)?.innerText,
                    sender: msgHelper?.querySelector(MESSAGE_SENDER_QUERY_SELECTOR)?.innerText,
                };
            });
        }
        return chats;
    }

    let chats = [];

    async function extractChats() {
        let tabs = document.querySelectorAll(MATCHES_MESSAGES_TABS_QUERY_SELECTOR);
        if (!tabs.length) return;
        if (tabs[0].ariaSelected !== "true") { tabs[0].click(); await sleep(TAB_CHANGE_DELAY); }
        chats.push(...extractNewChats());
        if (tabs[1].ariaSelected !== "true") { tabs[1].click(); await sleep(TAB_CHANGE_DELAY); }
        chats.push(...(await extractStartedChats()));
        console.log("Extracted chats", chats);
    }

    // Not wired to auto-chat yet; placeholder entry
    setTimeout(() => { extractChats(); }, 2000);
})();
