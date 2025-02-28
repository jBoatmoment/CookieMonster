// timer.js

let timerInterval;
let seconds = 0;
let minutes = 0;
let hours = 0;
let isTimerRunning = false;

function formatTime() {
    const pad = num => num < 10 ? '0' + num : num;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Start the timer
function startTimer() {
    if (!isTimerRunning) {
        timerInterval = setInterval(() => {
            seconds++;
            if (seconds >= 60) {
                seconds = 0;
                minutes++;
            }
            if (minutes >= 60) {
                minutes = 0;
                hours++;
            }

            // Send the updated time to the popup and background
            chrome.runtime.sendMessage({
                action: 'update',
                seconds,
                minutes,
                hours
            });

        }, 1000);
        isTimerRunning = true;
    }
}

// Stop and reset the timer
function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    seconds = 0;
    minutes = 0;
    hours = 0;

    // Send the reset state to popup and background
    chrome.runtime.sendMessage({
        action: 'update',
        seconds,
        minutes,
        hours
    });
}

// Listen for start/stop requests from popup.js or background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
        startTimer();
    } else if (message.action === 'stop') {
        stopTimer();
    } else if (message.action === 'getState') {
        sendResponse({ isTimerRunning, seconds, minutes, hours });
    }
});
