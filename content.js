// content.js

// Function to check if a script is trying to access cookies
function monitorCookieAccess() {
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  
    Object.defineProperty(document, 'cookie', {
      get: function () {
        const origin = window.location.origin;
        chrome.runtime.sendMessage({
          action: 'cookieAccessAttempt',
          site: origin
        });
        return originalCookieDescriptor.get.call(document);
      },
      set: function (value) {
        const origin = window.location.origin;
        chrome.runtime.sendMessage({
          action: 'cookieAccessAttempt',
          site: origin
        });
        originalCookieDescriptor.set.call(document, value);
      }
    });
  }
  
  // Execute the function to monitor cookie access
  monitorCookieAccess();