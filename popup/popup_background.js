let timerInterval;
let seconds = 0;
let minutes = 0;
let hours = 0;
let isTimerRunning = false;
let startTime = null;

// Start the timer in the background
function startTimer() {
    if (!isTimerRunning) {
        startTime = Date.now() - (hours * 3600000 + minutes * 60000 + seconds * 1000); // Restore elapsed time
        timerInterval = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        saveTimerState();
    }
}

// Stop and reset the timer in the background
function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    seconds = 0;
    minutes = 0;
    hours = 0;
    startTime = null;

    saveTimerState();
}

// Update the timer every second
function updateTimer() {
    if (startTime) {
        const elapsedTime = Date.now() - startTime;
        seconds = Math.floor(elapsedTime / 1000) % 60;
        minutes = Math.floor(elapsedTime / (1000 * 60)) % 60;
        hours = Math.floor(elapsedTime / (1000 * 60 * 60));

        // Save timer state in storage
        saveTimerState();

        // Notify popup.js and other scripts
        chrome.runtime.sendMessage({
            action: 'update',
            seconds,
            minutes,
            hours
        });
    }
}

// Save the timer state to `chrome.storage.local`
function saveTimerState() {
    chrome.storage.local.set({
        'timerState': {
            isTimerRunning,
            seconds,
            minutes,
            hours,
            startTime
        }
    });
}

// Load timer state from storage when extension is reloaded
function loadTimerState() {
    chrome.storage.local.get("timerState", (data) => {
        if (data.timerState) {
            ({ isTimerRunning, seconds, minutes, hours, startTime } = data.timerState);
            if (isTimerRunning) {
                startTimer(); // Resume timer if it was running
            }
        }
    });
}

// Listen for popup opening and closing
chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((msg) => {
        if (msg.action === 'start') {
            startTimer();
        } else if (msg.action === 'stop') {
            stopTimer();
        } else if (msg.action === 'getState') {
            port.postMessage({ isTimerRunning, seconds, minutes, hours });
        }
    });
});

// Load timer state on script startup
loadTimerState();
