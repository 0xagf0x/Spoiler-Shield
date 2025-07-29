// Enhanced Spoiler Shield Background Script with Toggle Support - v1.3
console.log('[Background] Service worker loaded');

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  // Initialize storage with empty watchlist if not exists
  chrome.storage.sync.get(['watchlist', 'extensionEnabled'], (result) => {
    const updates = {};
    
    if (!result.watchlist) {
      updates.watchlist = [];
    }
    
    if (result.extensionEnabled === undefined) {
      updates.extensionEnabled = true; // Default to enabled
    }
    
    updates.lastVersion = chrome.runtime.getManifest().version;
    
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates);
      console.log('[Background] Storage initialized with:', updates);
    }
  });

  // Show welcome notification on first install
  if (details.reason === 'install') {
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#53b269' });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 5000);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.type || message.action);
  
  switch (message.action || message.type) {
    case 'updateWatchlist':
      handleWatchlistUpdate(message.watchlist);
      break;
      
    case 'getWatchlist':
      chrome.storage.sync.get(['watchlist', 'extensionEnabled'], (result) => {
        sendResponse({ 
          watchlist: result.watchlist || [],
          extensionEnabled: result.extensionEnabled !== false
        });
      });
      return true; // Keep channel open for async response
      
    case 'toggleExtension':
      handleToggle(message.enabled);
      break;
      
    case 'spoilerDetected':
      handleSpoilerDetection(message.term, sender.tab);
      break;
      
    case 'extensionStatus':
      chrome.storage.sync.get(['extensionEnabled'], (result) => {
        sendResponse({ 
          enabled: result.extensionEnabled !== false,
          version: chrome.runtime.getManifest().version 
        });
      });
      return true; // Keep channel open for async response
      
    default:
      sendResponse({ success: true });
  }
});

// Handle extension toggle
function handleToggle(enabled) {
  console.log('[Background] Toggle extension:', enabled);
  
  chrome.storage.sync.set({ extensionEnabled: enabled }, () => {
    // Update badge based on state
    updateBadgeForState(enabled);
    
    // Notify all content scripts
    notifyAllContentScripts();
  });
}

// Handle watchlist updates
function handleWatchlistUpdate(watchlist) {
  console.log('[Background] Updating watchlist:', watchlist);
  
  chrome.storage.sync.get(['extensionEnabled'], (result) => {
    const extensionEnabled = result.extensionEnabled !== false;
    
    // Update badge to show status
    updateBadgeForWatchlist(watchlist, extensionEnabled);
    
    // Notify all content scripts
    notifyAllContentScripts();
  });
}

// Update badge based on extension state and watchlist
function updateBadgeForState(enabled) {
  if (enabled) {
    chrome.storage.sync.get(['watchlist'], (result) => {
      const watchlist = result.watchlist || [];
      updateBadgeForWatchlist(watchlist, true);
    });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }
}

function updateBadgeForWatchlist(watchlist, enabled) {
  if (!enabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } else if (watchlist.length > 0) {
    chrome.action.setBadgeText({ text: watchlist.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#53b269' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Notify all content scripts with current state
function notifyAllContentScripts() {
  chrome.storage.sync.get(['watchlist', 'extensionEnabled'], (result) => {
    const watchlist = result.watchlist || [];
    const extensionEnabled = result.extensionEnabled !== false;
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateWatchlist',
            watchlist: extensionEnabled ? watchlist : [],
            extensionEnabled: extensionEnabled
          }).catch(() => {
            // Ignore errors for tabs without content script
          });
        }
      });
    });
  });
}

// Handle spoiler detection reporting
function handleSpoilerDetection(term, tab) {
  console.log(`[Background] Spoiler detected: "${term}" on ${tab?.url}`);
  
  // Could be used for analytics or user notifications
  // For now, just log it
}

// Tab update handler - inject content script if needed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const supportedSites = [
      'reddit.com', 'twitter.com', 'x.com', 'facebook.com',
      'youtube.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'discord.com'
    ];
    
    const isSupported = supportedSites.some(site => url.hostname.includes(site));
    
    if (isSupported) {
      try {
        // Ensure content script is injected
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        console.log(`[Background] Content script injected into ${url.hostname}`);
      } catch (error) {
        // Script might already be injected or tab might not be ready
        console.log(`[Background] Could not inject script into ${url.hostname}:`, error.message);
      }
    }
  }
});

// Context menu setup (optional feature)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToWatchlist',
    title: 'Add "%s" to Spoiler Shield',
    contexts: ['selection'],
    documentUrlPatterns: [
      '*://*.reddit.com/*',
      '*://*.twitter.com/*',
      '*://*.x.com/*',
      '*://*.facebook.com/*',
      '*://*.youtube.com/*',
      '*://*.instagram.com/*'
    ]
  });
  
  chrome.contextMenus.create({
    id: 'toggleExtension',
    title: 'Toggle Spoiler Shield',
    contexts: ['page', 'frame'],
    documentUrlPatterns: [
      '*://*.reddit.com/*',
      '*://*.twitter.com/*',
      '*://*.x.com/*',
      '*://*.facebook.com/*',
      '*://*.youtube.com/*',
      '*://*.instagram.com/*'
    ]
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToWatchlist' && info.selectionText) {
    const selectedText = info.selectionText.trim();
    
    if (selectedText.length > 0 && selectedText.length < 100) {
      // Add to watchlist
      chrome.storage.sync.get(['watchlist'], (result) => {
        const watchlist = result.watchlist || [];
        
        // Check if already exists (case insensitive)
        const exists = watchlist.some(item => 
          item.toLowerCase() === selectedText.toLowerCase()
        );
        
        if (!exists) {
          watchlist.push(selectedText);
          chrome.storage.sync.set({ watchlist }, () => {
            handleWatchlistUpdate(watchlist);
            
            // Show notification
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon-shield.png',
              title: 'Spoiler Shield',
              message: `Added "${selectedText}" to watchlist`
            });
          });
        }
      });
    }
  } else if (info.menuItemId === 'toggleExtension') {
    // Toggle extension on/off
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      const currentState = result.extensionEnabled !== false;
      const newState = !currentState;
      
      handleToggle(newState);
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-shield.png',
        title: 'Spoiler Shield',
        message: newState ? 'Extension enabled' : 'Extension disabled'
      });
    });
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.watchlist) {
      console.log('[Background] Watchlist changed:', changes.watchlist.newValue);
      chrome.storage.sync.get(['extensionEnabled'], (result) => {
        const enabled = result.extensionEnabled !== false;
        updateBadgeForWatchlist(changes.watchlist.newValue || [], enabled);
      });
    }
    
    if (changes.extensionEnabled) {
      console.log('[Background] Extension state changed:', changes.extensionEnabled.newValue);
      updateBadgeForState(changes.extensionEnabled.newValue);
    }
    
    // Always notify content scripts when storage changes
    notifyAllContentScripts();
  }
});

// Initialize badge on startup
chrome.storage.sync.get(['watchlist', 'extensionEnabled'], (result) => {
  const watchlist = result.watchlist || [];
  const enabled = result.extensionEnabled !== false;
  updateBadgeForWatchlist(watchlist, enabled);
});

// Alarm for periodic cleanup (optional)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    console.log('[Background] Performing periodic cleanup');
    // Could clean up old data, update statistics, etc.
  }
});

// Set up periodic cleanup
chrome.alarms.create('cleanup', { 
  delayInMinutes: 60, // Run every hour
  periodInMinutes: 60 
});

// Service worker keep-alive (for Chrome's aggressive cleanup in MV3)
let keepAliveInterval;

function keepServiceWorkerAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This API call keeps the service worker alive
    });
  }, 25000); // Every 25 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep-alive when extension is active
chrome.runtime.onStartup.addListener(keepServiceWorkerAlive);
chrome.runtime.onInstalled.addListener(keepServiceWorkerAlive);

// Stop keep-alive when extension is suspended
chrome.runtime.onSuspend.addListener(stopKeepAlive);

console.log('[Background] Service worker ready with enhanced features and toggle support');