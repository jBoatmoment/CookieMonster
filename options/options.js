document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(['blockThirdPartyCookies', 'disableSessionHijacking'], function(items) {
        document.getElementById('blockThirdPartyCookies').checked = items.blockThirdPartyCookies || false;
        document.getElementById('disableSessionHijacking').checked = items.disableSessionHijacking || false;
    });

    // Save settings when the user clicks the save button
    document.getElementById('saveButton').addEventListener('click', function() {
        const blockThirdPartyCookies = document.getElementById('blockThirdPartyCookies').checked;
        const disableSessionHijacking = document.getElementById('disableSessionHijacking').checked;

        chrome.storage.sync.set({
            blockThirdPartyCookies: blockThirdPartyCookies,
            disableSessionHijacking: disableSessionHijacking
        }, function() {
            alert('Settings saved successfully.');
        });
    });
});