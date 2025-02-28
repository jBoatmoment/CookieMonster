const WHITELISTED_SITES = ["https://trusted-site.com", "https://example.com"];

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    for (let header of details.requestHeaders) {
      if (header.name.toLowerCase() === "cookie") {
        const origin = new URL(details.initiator || details.url).origin;
        
        if (!WHITELISTED_SITES.includes(origin)) {
          console.warn(`Blocked cookie access attempt from: ${origin}`);
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Cookie Hijacking Attempt Blocked",
            message: `A site (${origin}) attempted to access your cookies without authorization.`
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

// Allows updating the whitelist dynamically
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateWhitelist") {
    WHITELISTED_SITES.push(...message.sites);
    sendResponse({ success: true, updatedWhitelist: WHITELISTED_SITES });
  }
});

// Adds a listener for frontend UI to update whitelist
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addToWhitelist") {
    if (message.site && !WHITELISTED_SITES.includes(message.site)) {
      WHITELISTED_SITES.push(message.site);
      sendResponse({ success: true, updatedWhitelist: WHITELISTED_SITES });
    } else {
      sendResponse({ success: false, message: "Site already in whitelist or invalid." });
    }
  }
});