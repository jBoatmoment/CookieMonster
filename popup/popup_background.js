let timerInterval;
let seconds = 0;
let minutes = 0;
let hours = 0;
let isTimerRunning = false;

// Start the timer in the background
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

            chrome.storage.local.set({
                'timerState': {
                    isOn: true,
                    isTimerRunning: true,
                    seconds,
                    minutes,
                    hours
                }
            });
        }, 1000);
        isTimerRunning = true;
    }
}

// Stop the timer in the background
function stopTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    seconds = 0;
    minutes = 0;
    hours = 0;

    chrome.storage.local.set({
        'timerState': {
            isOn: false,
            isTimerRunning: false,
            seconds,
            minutes,
            hours
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
        }
    });
});
