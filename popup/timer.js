let timerInterval;
let seconds = 0;
let minutes = 0;
let hours = 0;
let isTimerRunning = false;
let startTime = null;

// Function to format time in HH:MM:SS
function formatTime() {
    const pad = num => (num < 10 ? '0' + num : num);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Start the timer
function startTimer() {
    if (!isTimerRunning) {
        startTime = Date.now() - (hours * 3600000 + minutes * 60000 + seconds * 1000); // Restore elapsed time
        timerInterval = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        saveTimerState();
    }
}

// Stop and reset the timer
function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    seconds = 0;
    minutes = 0;
    hours = 0;
    startTime = null;

    // Save the reset state
    saveTimerState();

    // Send the reset state to popup and background
    chrome.runtime.sendMessage({
        action: 'update',
        seconds,
        minutes,
        hours
    });
}

// Update the timer every second
function updateTimer() {
    if (startTime) {
        const elapsedTime = Date.now() - startTime;
        seconds = Math.floor(elapsedTime / 1000) % 60;
        minutes = Math.floor(elapsedTime / (1000 * 60)) % 60;
        hours = Math.floor(elapsedTime / (1000 * 60 * 60));

        // Send the updated time to the popup and background
        chrome.runtime.sendMessage({
            action: 'update',
            seconds,
            minutes,
            hours
        });

        // Save the updated timer state
        saveTimerState();
    }
}

// Save the timer state to storage
function saveTimerState() {
    chrome.storage.local.set({
        timerState: {
            isTimerRunning,
            seconds,
            minutes,
            hours,
            startTime
        }
    });
}

// Load timer state from storage
function loadTimerState() {
    chrome.storage.local.get("timerState", (data) => {
        if (data.timerState) {
            ({ isTimerRunning, seconds, minutes, hours, startTime } = data.timerState);
            if (isTimerRunning) {
                startTimer(); // Resume the timer if it was running
            }
        }
    });
}

// Listen for messages from popup.js or background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
        startTimer();
    } else if (message.action === 'stop') {
        stopTimer();
    } else if (message.action === 'getState') {
        sendResponse({ isTimerRunning, seconds, minutes, hours });
    }
});

// Load stored state when script is initialized
loadTimerState();
