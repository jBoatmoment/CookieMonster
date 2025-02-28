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
  // Existing handlers
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
  
  // New handlers for content script messages
  if (message.action === "cookieAccessAttempt") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Cookie Access Detected",
      message: `A script on ${message.site} attempted to access cookies.`,
    });
    // Log this for later analysis
    console.log(`Cookie access attempt from ${message.site}`);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "scriptBlockAttempt") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Unauthorized Script Blocked",
      message: `Blocked loading of: ${message.scriptSrc}`,
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "secureCookies") {
    // This could be enhanced to force-secure cookies when possible
    console.log(`Securing cookies for: ${message.site}`);
    // Add additional security measures here
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "requestBlocked") {
    // Log blocked request attempts
    console.log(`Blocked request to: ${message.requestUrl}`);
    // You might want to add a notification here as well for important blocks
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "inlineScriptBlocked") {
    console.log(`Blocked inline script on: ${message.site}`);
    // For frequent events like this, you might want to batch notifications
    // rather than showing one for each blocked inline script
    sendResponse({ success: true });
    return true;
  }
});

// Optional: Add an installation or update handler to initialize settings
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Initialize default settings on first install
    chrome.storage.local.set({
      whitelist: DEFAULT_WHITELIST,
      notificationLevel: "high", // Could be used to control notification frequency
      active: true // Extension active state
    });
    
    // Show welcome message
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "Cookie Protection Installed",
      message: "Your browser is now protected against cookie hijacking attempts.",
    });
  }
});

// Optional: Add context menu for quick whitelist addition
chrome.contextMenus.create({
  id: "addToWhitelist",
  title: "Add this site to cookie whitelist",
  contexts: ["page"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToWhitelist" && tab.url) {
    const origin = new URL(tab.url).origin;
    chrome.runtime.sendMessage({
      action: "addToWhitelist",
      site: origin
    });
  }
});