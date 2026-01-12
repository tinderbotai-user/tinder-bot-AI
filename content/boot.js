(function () {
    console.log("Boot.js::anon function > Booting, URL: ", location.href);
    const url = new URL(location.href);
    const path = url.pathname || "";


// Always register the tab with background so it can lock one active tab.
    try {
        chrome.runtime.sendMessage({ action: "register_tab", context: { url: location.href } });
    } catch (e) {}


// Only inject swiper on recs screen; chatter on matches/messages.
    const loadScript = (path) => new Promise((resolve, reject) => {
        console.log("Boot.js::loadScript > Booting, loading script: ", path);
        const s = document.createElement("script");
        s.src = chrome.runtime.getURL(path);
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        (document.documentElement || document.head || document.body).appendChild(s);
    });


    const isRecs = /\/app\/(recs|explore)/.test(path);
    const isMessages = /\/app\/(matches|messages)/.test(path);


    if (isRecs) {
        loadScript("content/swiper.js").catch(() => {});
    } else if (isMessages) {
        loadScript("content/chatter.js").catch(() => {});
    }
})();