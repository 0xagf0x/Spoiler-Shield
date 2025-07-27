// background.js
console.log('[Spoiler Shield] Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Spoiler Shield] Extension installed');
  
  // Set default storage values if they don't exist
  chrome.storage.sync.get(['watchlist'], (result) => {
    if (!result.watchlist) {
      chrome.storage.sync.set({ 
        watchlist: [],
        settings: {
          aiEnabled: true,
          contextAware: true,
          blurIntensity: 6
        }
      });
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSpoilerStats') {
    // Could implement statistics tracking here
    sendResponse({ 
      blocked: 0, // placeholder
      enabled: true 
    });
  }
});

// Optional: Badge update when spoilers are blocked
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'spoilerBlocked') {
    // Update badge with count of blocked spoilers
    chrome.action.setBadgeText({
      text: '!',
      tabId: sender.tab.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#FF4444'
    });
    
    // Clear badge after 3 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({
        text: '',
        tabId: sender.tab.id
      });
    }, 3000);
  }
});