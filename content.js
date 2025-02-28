  // Function to check if a script is trying to access cookies
  function monitorCookieAccess() {
    try {
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  
      Object.defineProperty(document, "cookie", {
        get: function () {
          const origin = window.location.origin;
          chrome.runtime.sendMessage({
            action: "cookieAccessAttempt",
            site: origin,
          });
          return originalCookieDescriptor.get.call(document);
        },
        set: function (value) {
          const origin = window.location.origin;
          chrome.runtime.sendMessage({
            action: "cookieAccessAttempt",
            site: origin,
          });
          try {
            originalCookieDescriptor.set.call(document, value);
          } catch (error) {
            console.error("Cookie modification blocked:", error);
          }
        },
      });
    } catch (error) {
      console.error("Failed to monitor cookie access:", error);
    }
  }
  
  // Function to block unauthorized script injections
  function blockUnauthorizedScripts() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === "SCRIPT" && node.src && !node.src.startsWith(window.location.origin)) {
            console.warn(`Blocked unauthorized script: ${node.src}`);
            node.remove();
            chrome.runtime.sendMessage({
              action: "scriptBlockAttempt",
              scriptSrc: node.src,
            });
          }
        });
      });
    });
  
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  
  // Function to block unauthorized cookie modification via JavaScript
  function blockCookieStealing() {
    document.addEventListener("beforeunload", () => {
      chrome.runtime.sendMessage({
        action: "secureCookies",
        site: window.location.origin,
      });
    });
  }
  
  // Function to monitor and prevent unauthorized requests
  function monitorRequests() {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0];
      if (typeof url === "string" && !url.startsWith(window.location.origin)) {
        console.warn(`Blocked cross-origin request to ${url}`);
        chrome.runtime.sendMessage({ action: "requestBlocked", requestUrl: url });
        return Promise.reject(new Error("Blocked unauthorized request"));
      }
      return originalFetch(...args);
    };
  
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (typeof url === "string" && !url.startsWith(window.location.origin)) {
        console.warn(`Blocked XMLHttpRequest to ${url}`);
        chrome.runtime.sendMessage({ action: "requestBlocked", requestUrl: url });
        return;
      }
      return originalXHROpen.call(this, method, url, ...rest);
    };
  }
  
  // Function to block inline script-based event handlers
  function blockInlineScripts() {
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      const safeAttributes = ["id", "class", "href", "src", "alt", "title"];
  
      if (name.startsWith("on") && !safeAttributes.includes(name)) {
        console.warn(`Blocked inline event handler: ${name}`);
        chrome.runtime.sendMessage({ action: "inlineScriptBlocked", site: window.location.origin });
        return;
      }
      originalSetAttribute.call(this, name, value);
    };
  }
  
  // Function to check if cookies are missing security flags
  function checkSecureCookies() {
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "checkCookiesSecurity", site: window.location.origin });
    }, 500); // Delay to ensure cookies are accessible
  }
  
  // Execute security functions
  document.addEventListener("DOMContentLoaded", () => {
    checkSecureCookies();
    monitorRequests();
    blockInlineScripts();
    monitorCookieAccess();
    blockUnauthorizedScripts();
    blockCookieStealing();
  });