const DEFAULT_WHITELIST = ["https://trusted-site.com", "https://example.com"];
let WHITELISTED_SITES = [...DEFAULT_WHITELIST];

// Load whitelist from storage
chrome.storage.local.get("whitelist", (data) => {
  if (data.whitelist) {
    WHITELISTED_SITES = data.whitelist;
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    for (let header of details.requestHeaders) {
      if (header.name.toLowerCase() === "cookie") {
        const origin = details.initiator ? new URL(details.initiator).origin : null;

        if (origin && !WHITELISTED_SITES.includes(origin)) {
          console.warn(`Blocked cookie access attempt from: ${origin}`);
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Cookie Hijacking Attempt Blocked",
            message: `A site (${origin}) attempted to access your cookies without authorization.`,
          });
          return { cancel: true };
        }
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// Unified listener for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateWhitelist" || message.action === "addToWhitelist") {
    const newSites = message.sites ? message.sites : [message.site];

    newSites.forEach((site) => {
      if (site && !WHITELISTED_SITES.includes(site)) {
        WHITELISTED_SITES.push(site);
      }
    });

    chrome.storage.local.set({ whitelist: WHITELISTED_SITES }, () => {
      sendResponse({ success: true, updatedWhitelist: WHITELISTED_SITES });
    });

    return true; // Required for async sendResponse
  }

  if (message.action === "checkCookiesSecurity") {
    chrome.cookies.getAll({ domain: new URL(message.site).hostname }, (cookies) => {
      let insecureCookies = cookies.filter(cookie => !cookie.secure || !cookie.httpOnly);

      if (insecureCookies.length > 0) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Insecure Cookies Detected",
          message: `Some cookies on ${message.site} are missing security flags.`,
        });
      }

      sendResponse({ success: true, checked: cookies.length, insecure: insecureCookies.length });
    });

    return true; // Required for async sendResponse
  }
});