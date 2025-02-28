document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("toggle-button");
    const statusText = document.getElementById("status-text");
    const statusImage = document.getElementById("status-image");
    const timer = document.getElementById("clock");
    const currentSiteDisplay = document.getElementById("current-site");
    const whitelistCountDisplay = document.getElementById("whitelist-count");
    const addToWhitelistButton = document.getElementById("add-to-whitelist");

    let timerInterval;
    let seconds = 0;
    let minutes = 0;
    let hours = 0;
    let isTimerRunning = false;
    let startTime = null;
    let isExtensionOn = false;

    // Load the state from localStorage
    const savedState = JSON.parse(localStorage.getItem('timerState') || '{"isOn": false}');

    // Initialize variables with default values
    if (savedState && savedState.isOn && !isNaN(savedState.startTime)) {
        startTime = savedState.startTime;
        isExtensionOn = true;
        button.classList.add("on");
        statusText.textContent = "Extension is On!";
        statusImage.src = "status_issue.png";
        statusText.style.transform = "translateY(0px) scale(1)";
        statusText.style.fontSize = "24px";
        updateBackgroundSize(true);
    } 

    function applyJiggleAnimation(element) {
        
        element.classList.remove("jiggle");
        
        
        void element.offsetWidth;
        
        
        element.classList.add("jiggle");
        
        setTimeout(() => {
            element.classList.remove("jiggle");
        }, 350); 
    }
    
    function formatTime(h, m, s) {
        const pad = num => num < 10 ? '0' + num : num;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function updateTimer() {
        if (startTime) {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            seconds = elapsedTime % 60;
            minutes = Math.floor(elapsedTime / 60) % 60;
            hours = Math.floor(elapsedTime / 3600);

            timer.textContent = formatTime(hours, minutes, seconds);

            // Store the current state in localStorage
            localStorage.setItem('timerState', JSON.stringify({
                isOn: true,
                startTime: startTime,
                lastTime: Date.now()
            }));
        }
    }

    function startTimer() {
        if (!isTimerRunning) {
            timerInterval = setInterval(updateTimer, 1000);
            isTimerRunning = true;
            // Update immediately to avoid the 1-second delay
            updateTimer();
        }
    }

    function stopTimer() {
        clearInterval(timerInterval);
        isTimerRunning = false;
        seconds = 0;
        minutes = 0;
        hours = 0;
        timer.textContent = formatTime(hours, minutes, seconds);
        
        // Reset state in localStorage when turned off
        localStorage.setItem('timerState', JSON.stringify({
            isOn: false,
            startTime: null,
            lastTime: Date.now()
        }));
    }

    // Update the background height by toggling the bg-height-scale class
    function updateBackgroundSize(isOn) {
        if (isOn) {
            document.body.classList.add('bg-height-scale');
        } else {
            document.body.classList.remove('bg-height-scale');
        }
    }

    // Get main domain from the current URL
    function getMainDomain(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');
            return domain;
        } catch (e) {
            console.error("Invalid URL:", url);
            return "Not Available";
        }
    }

    // Update current site information
    function updateCurrentSite() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].url) {
                const domain = getMainDomain(tabs[0].url);
                currentSiteDisplay.textContent = domain;
            } else {
                currentSiteDisplay.textContent = "Not Available";
            }
        });
    }

    // Add the current site to the whitelist
    function addToWhitelist() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs.length) {
                console.error("No active tab found.");
                return;
            }
    
            const currentSite = tabs[0].url;
            if (!currentSite) {
                console.error("No URL in current tab.");
                return;
            }
    
            const domain = getMainDomain(currentSite);
            currentSiteDisplay.textContent = domain;
    
            // Send message to the background script to add the site to whitelist
            chrome.runtime.sendMessage({
                action: 'addToWhitelist',
                site: currentSite
            }, (response) => {
                if (response && response.success) {
                    // Site added to whitelist
                    console.log("Site added to whitelist:", response.site);
                    updateWhitelistCount();
                    showNotification("Site Whitelisted", `Added ${domain} to whitelist`);
                } else if (response && !response.success) {
                    console.log("Site is already in the whitelist.");
                    updateWhitelistCount(); // Update count even if the site exists
                    applyJiggleAnimation(whitelistCountDisplay);
                    showNotification("Site Already in Whitelist", `${domain} is already in the whitelist`);
                }
            });
        });

        updateWhitelistCount();
    }

    const removeFromWhitelistButton = document.getElementById("remove-from-whitelist");

    function removeFromWhitelist() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs.length) {
                console.error("No active tab found.");
                return;
            }
    
            const currentSite = tabs[0].url;
            if (!currentSite) {
                console.error("No URL in current tab.");
                return;
            }
    
            const domain = getMainDomain(currentSite);
            currentSiteDisplay.textContent = domain;
    
            // Send message to the background script to add the site to whitelist
            chrome.runtime.sendMessage({
                action: 'removeFromWhitelist',
                site: currentSite
            }, (response) => {
                if (response && !response.success) {
                    // Site added to whitelist
                    console.log("Site added to whitelist:", response.site);
                    updateWhitelistCount();
                    showNotification("Site Whitelisted", `Added ${domain} to whitelist`);
                    
                    // Add a visual pop animation when site is successfully added
                    applyPopOutAnimation(addToWhitelistButton);
                } else if (response && response.success) {
                    console.log("Site is already in the whitelist.");
                    updateWhitelistCount(); // Update count even if the site exists
                    
                    // Apply jiggle animation to the button if site is already in whitelist
                    applyJiggleAnimation(whitelistCountDisplay);
                    
                    showNotification("Site Already in Whitelist", `${domain} is already in the whitelist`);
                }
            });
        });

        updateWhitelistCount();
    }

    // Add the event listener for the remove button
    removeFromWhitelistButton.addEventListener("click", removeFromWhitelist);

    // Update the whitelist count
    function updateWhitelistCount() {
        chrome.runtime.sendMessage({ action: 'getWhitelistCount' }, (response) => {
            if (response && response.count !== undefined) {
                whitelistCountDisplay.textContent = response.count;
            }
        });
    }

    // Handle power button click to toggle the state
    button.addEventListener("click", () => {
        if (!isExtensionOn) {
            isExtensionOn = true;
            button.classList.add("on");
            statusText.textContent = "Extension is On!";
            statusImage.src = "status_issue.png";
            
            // Start timer from 0
            startTime = Date.now();
            startTimer();

            // Update visual elements
            updateBackgroundSize(true);
            statusText.style.transform = "translateY(0px) scale(1)";
            statusText.style.fontSize = "24px";
            
            // Send message to background script to activate extension
            chrome.runtime.sendMessage({ action: 'activateExtension' });
        } else {
            isExtensionOn = false;
            button.classList.remove("on");
            statusText.textContent = "Extension is Off";
            statusImage.src = "status_clear.png";
            
            // Stop and reset timer
            stopTimer();
            
            // Reset title position and size
            statusText.style.transform = "translateY(10px) scale(0.8)";
            statusText.style.fontSize = "24px";
            
            // Reset the visual state
            updateBackgroundSize(false);
            
            // Send message to background script to deactivate extension
            chrome.runtime.sendMessage({ action: 'deactivateExtension' });
        }
    });

    addToWhitelistButton.addEventListener("click", addToWhitelist);

    if (savedState && savedState.isOn && !isNaN(savedState.startTime)) {
        startTimer();
    } else {
        timer.textContent = formatTime(0, 0, 0);
    }

    updateCurrentSite();
    updateWhitelistCount();

    // Handle incoming messages from background.js or content.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updateWhitelist" || message.action === "addToWhitelist") {
            updateWhitelistCount();
            showNotification("Whitelist Updated", `Site: ${message.site || "Unknown"}`);
        }

        if (message.action === "checkCookiesSecurity") {
            showNotification("Insecure Cookies Detected", message.message);
            statusImage.src = "status_issue.png";
        }

        if (message.action === "cookieAccessAttempt") {
            showNotification("Cookie Access Attempt", message.message);
        }

        if (message.action === "scriptBlockAttempt") {
            showNotification("Unauthorized Script Blocked", `Blocked: ${message.scriptSrc}`);
        }

        if (message.action === "secureCookies") {
            showNotification("Secure Cookies", `Securing cookies for: ${message.site}`);
        }

        if (message.action === "requestBlocked") {
            showNotification("Request Blocked", `Blocked request to: ${message.requestUrl}`);
        }

        if (message.action === "inlineScriptBlocked") {
            showNotification("Inline Script Blocked", `Blocked inline script on: ${message.site}`);
        }
        
        // Respond with success
        sendResponse({ success: true });
        return true; // Keep the message channel open for async response
    });

    // Show a notification with the given title and message
    function showNotification(title, message) {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon_128.png",  // Path to your icon
                title: title,
                message: message,
            });
        } else {
            console.log(`Notification: ${title} - ${message}`);
        }
    }
});
