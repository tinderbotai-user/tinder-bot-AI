
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

