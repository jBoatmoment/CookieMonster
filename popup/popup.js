document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("toggle-button");
    const statusText = document.getElementById("status-text");
    const statusImage = document.getElementById("status-image");
    const clock = document.getElementById("clock");
    const timer = document.getElementById("timer");

    let timerInterval;
    let seconds = 0;
    let minutes = 0;
    let hours = 0;
    let isTimerRunning = false;

    // Load the state from localStorage
    const savedState = JSON.parse(localStorage.getItem('timerState'));

    // Initialize variables with default values if savedState is null or malformed
    let lastTime = savedState ? savedState.lastTime : Date.now(); // Default to current time if not found
    let startTime = savedState && savedState.startTime && !isNaN(savedState.startTime) ? savedState.startTime : Date.now(); // Ensure valid number

    // Function to format the time in HH:MM:SS format
    function formatTime() {
        const pad = num => num < 10 ? '0' + num : num;
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    // Update the timer every second
    function updateTimer() {
        if (startTime) {
            // Calculate the elapsed time
            const elapsedTime = Date.now() - startTime;
            seconds = Math.floor(elapsedTime / 1000) % 60;
            minutes = Math.floor(elapsedTime / (1000 * 60)) % 60;
            hours = Math.floor(elapsedTime / (1000 * 60 * 60));

            timer.textContent = formatTime();

            // Store the current state in localStorage
            localStorage.setItem('timerState', JSON.stringify({
                isOn: true,
                startTime: startTime,  // Save the start time
                lastTime: Date.now(),  // Save the last time the timer was updated
            }));
        }
    }

    // Start stopwatch
    function startTimer() {
        if (!isTimerRunning) {
            timerInterval = setInterval(updateTimer, 1000);  // Update every second
            isTimerRunning = true;
        }
    }

    // Stop stopwatch and reset to 0
    function stopTimer() {
        clearInterval(timerInterval);
        isTimerRunning = false;
        seconds = 0;
        minutes = 0;
        hours = 0;
        timer.textContent = formatTime();  // Reset the timer display to 00:00:00
        
        // Reset state in localStorage when turned off
        localStorage.setItem('timerState', JSON.stringify({
            isOn: false,
            startTime: null,  // Reset the startTime to null (no active timer)
            lastTime: Date.now(),  // Store the current time as lastTime
        }));
    }

    // Update the background height by toggling the bg-height-scale class
    function updateBackgroundSize(isOn) {
        if (isOn) {
            document.body.classList.add('bg-height-scale');  // Scale only the height
        } else {
            document.body.classList.remove('bg-height-scale');  // Reset to default
        }
    }

    // Handle button click to toggle the state
    button.addEventListener("click", () => {
        button.classList.toggle("on");

        if (button.classList.contains("on")) {
            statusText.textContent = "Extension is on!";
            statusImage.src = "status_issue.png";  // Change image to 'issue_found'
            
            // Start timer from 0
            startTime = Date.now();  // Reset startTime to current time
            startTimer();

            // Animate title up and scale down
            statusText.style.transform = "translateY(20px) scale(0.8)";  // Move up 20px and scale down
            statusText.style.fontSize = "18px";  // Smaller size

            // Move the button up by 20px
            button.style.transform = "translateY(-20px)";  // Move button up

            // Move the status image up by 10px
            statusImage.style.transform = "translateY(-25px)";  // Move image up

            // Show the clock and start counting
            clock.style.display = "block";  // Show clock

            // Update background height to 110%
            updateBackgroundSize(true);
        } else {
            statusText.textContent = "Extension is off";
            statusImage.src = "status_clear.png";  // Change image to 'status_clear'
            
            // Stop and reset timer
            stopTimer();

            // Reset title position and size
            statusText.style.transform = "translateY(0) scale(1)";  // Reset movement and size
            statusText.style.fontSize = "24px";  // Original size

            // Reset the button position
            button.style.transform = "translateY(0)";  // Reset button position

            // Reset the status image position
            statusImage.style.transform = "translateY(0)";  // Reset image position

            // Hide the clock
            clock.style.display = "none";  // Hide clock

            // Reset background height to 100%
            updateBackgroundSize(false);
        }
    });

    // On load, check if the timer should be running
    if (savedState && savedState.isOn && !isNaN(startTime)) {
        // Timer should already be running in the background; continue updating
        startTimer();
        statusText.textContent = "Extension is on!";
        statusImage.src = "status_issue.png";
        clock.style.display = "block";
        button.classList.add("on");
        updateBackgroundSize(true);

        // Immediately show the current time without waiting for 1 second
        updateTimer(); // This ensures the time is immediately displayed when opened
    } else {
        timer.textContent = formatTime();  // Display initial 00:00:00 if no saved state
    }
});
