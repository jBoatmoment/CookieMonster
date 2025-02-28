const DEFAULT_WHITELIST = ["https://trusted-site.com", "https://example.com"];
let WHITELISTED_SITES = [...DEFAULT_WHITELIST];

// Load whitelist from storage
chrome.storage.local.get("whitelist", (data) => {
  if (data.whitelist) {
    WHITELISTED_SITES = data.whitelist;
  }
});

// Set up declarativeNetRequest rules instead of webRequest
function updateBlockingRules() {
  // Create dynamic rules based on whitelist
  const rules = [];
  
  // Rule to block cookie headers for non-whitelisted sites
  // Note: In a real implementation, you'd need more sophisticated rules
  // as declarativeNetRequest has limitations on dynamic rule generation
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1], // Remove existing rule if any
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "cookie", operation: "remove" }
        ]
      },
      condition: {
        urlFilter: "*",
        resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest"]
      }
    }]
  });
  
  console.log("Updated blocking rules");
}

// Update rules when extension loads
updateBlockingRules();

// Unified listener for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getWhitelistCount") {
      chrome.storage.local.get("whitelist", (data) => {
          const count = data.whitelist ? data.whitelist.length : 0;
          sendResponse({ count });
      });
      return true; // Keep the message channel open for async response
  }

  // Existing handlers
  if (message.action === "updateWhitelist" || message.action === "addToWhitelist") {
    const newSites = message.sites ? message.sites : [message.site];

    // Check if a site was already in the whitelist
    const sitesAdded = newSites.filter(site => !WHITELISTED_SITES.includes(site));
    const sitesAlreadyInWhitelist = newSites.filter(site => WHITELISTED_SITES.includes(site));

    sitesAdded.forEach(site => WHITELISTED_SITES.push(site));

    // Save updated whitelist to chrome storage
    chrome.storage.local.set({ whitelist: WHITELISTED_SITES }, () => {
      updateBlockingRules(); // Update blocking rules when whitelist changes

      // If new sites were added, send success
      if (sitesAdded.length > 0) {
        sendResponse({
          success: true,
          updatedWhitelist: WHITELISTED_SITES
        });
      } else {
        // If sites were already in the whitelist, send a message that the site is already in the list
        sendResponse({
          success: false,
          message: `${sitesAlreadyInWhitelist.join(", ")} already in whitelist`
        });
      }
    });

    return true; // Keep the message channel open for async response
  }

  if (message.action === "removeFromWhitelist") {
    const newSites = message.sites ? message.sites : [message.site];

    const sitesRemoved = newSites.filter(site => WHITELISTED_SITES.includes(site));
    
    const sitesAlreadyInWhitelist = newSites.filter(site => !WHITELISTED_SITES.includes(site));

    WHITELISTED_SITES = WHITELISTED_SITES.filter(site => !sitesRemoved.includes(site));

    // Save updated whitelist to chrome storage
    chrome.storage.local.set({ whitelist: WHITELISTED_SITES }, () => {
      updateBlockingRules(); // Update blocking rules when whitelist changes

      // If new sites were added, send success
      if (sitesRemoved.length > 0) {
        sendResponse({
          success: true,
          updatedWhitelist: WHITELISTED_SITES
        });
      } else {
        // If sites were already in the whitelist, send a message that the site is already in the list
        sendResponse({
          success: false,
          message: `${sitesAlreadyInWhitelist.join(", ")} not in whitelist`
        });
      }
    });

    return true; // Keep the message channel open for async response
  }
  
  if (message.action === "checkCookiesSecurity") {
    console.log("Checking cookies for:", message.site);
    chrome.cookies.getAll({ domain: new URL(message.site).hostname }, (cookies) => {
      console.log("Found cookies:", cookies.length);
      let insecureCookies = cookies.filter(cookie => !cookie.secure || !cookie.httpOnly);
      console.log("Insecure cookies:", insecureCookies.length, insecureCookies);
      if (insecureCookies.length > 0) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon_128.png",
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
      iconUrl: "icons/icon_128.png",
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
      iconUrl: "icons/icon_128.png",
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
      iconUrl: "icons/icon_128.png",
      title: "Cookie Protection Installed",
      message: "Your browser is now protected against cookie hijacking attempts.",
    });
    
    // Create context menu for quick whitelist addition
    chrome.contextMenus.create({
      id: "addToWhitelist",
      title: "Add this site to cookie whitelist",
      contexts: ["page"]
    });
  }
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToWhitelist" && tab.url) {
    const origin = new URL(tab.url).origin;
    chrome.runtime.sendMessage({
      action: "addToWhitelist",
      site: origin
    });
  }
});

// Service worker for Manifest V3 needs to stay alive
chrome.action.onClicked.addListener((tab) => {
  // This keeps the service worker active when the extension icon is clicked
  console.log("Extension icon clicked");
});
