// Firefox-compatible background script (Manifest V2)

// Extension installation/update handler
browser.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  // Initialize storage with empty watchlist if not exists
  browser.storage.sync.get(['watchlist', 'extensionEnabled']).then((result) => {
    const updates = {};
    
    if (!result.watchlist) {
      updates.watchlist = [];
    }
    
    if (result.extensionEnabled === undefined) {
      updates.extensionEnabled = true; // Default to enabled
    }
    
    updates.lastVersion = browser.runtime.getManifest().version;
    
    if (Object.keys(updates).length > 0) {
      browser.storage.sync.set(updates);
    }
  });

  // Show welcome notification on first install
  if (details.reason === 'install') {
    browser.browserAction.setBadgeText({ text: 'NEW' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#53b269' });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      browser.browserAction.setBadgeText({ text: '' });
    }, 5000);
  }
});

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action || message.type) {
    case 'updateWatchlist':
      handleWatchlistUpdate(message.watchlist);
      break;
      
    case 'getWatchlist':
      browser.storage.sync.get(['watchlist', 'extensionEnabled']).then((result) => {
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
      browser.storage.sync.get(['extensionEnabled']).then((result) => {
        sendResponse({ 
          enabled: result.extensionEnabled !== false,
          version: browser.runtime.getManifest().version 
        });
      });
      return true; // Keep channel open for async response
      
    default:
      sendResponse({ success: true });
  }
});

// Handle extension toggle
function handleToggle(enabled) {
  browser.storage.sync.set({ extensionEnabled: enabled }).then(() => {
    // Update badge based on state
    updateBadgeForState(enabled);
    
    // Notify all content scripts
    notifyAllContentScripts();
  });
}

// Handle watchlist updates
function handleWatchlistUpdate(watchlist) {
  browser.storage.sync.get(['extensionEnabled']).then((result) => {
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
    browser.storage.sync.get(['watchlist']).then((result) => {
      const watchlist = result.watchlist || [];
      updateBadgeForWatchlist(watchlist, true);
    });
  } else {
    browser.browserAction.setBadgeText({ text: 'OFF' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#ef4444' });
  }
}

function updateBadgeForWatchlist(watchlist, enabled) {
  if (!enabled) {
    browser.browserAction.setBadgeText({ text: 'OFF' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#ef4444' });
  } else if (watchlist.length > 0) {
    browser.browserAction.setBadgeText({ text: watchlist.length.toString() });
    browser.browserAction.setBadgeBackgroundColor({ color: '#53b269' });
  } else {
    browser.browserAction.setBadgeText({ text: '' });
  }
}

// Notify all content scripts with current state
function notifyAllContentScripts() {
  browser.storage.sync.get(['watchlist', 'extensionEnabled']).then((result) => {
    const watchlist = result.watchlist || [];
    const extensionEnabled = result.extensionEnabled !== false;
    
    browser.tabs.query({}).then((tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          browser.tabs.sendMessage(tab.id, {
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
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const supportedSites = [
      'reddit.com', 'twitter.com', 'x.com', 'facebook.com',
      'youtube.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'discord.com'
    ];
    
    const isSupported = supportedSites.some(site => url.hostname.includes(site));
    
    if (isSupported) {
      try {
        // Firefox doesn't need explicit script injection for content scripts
        // They are automatically injected based on manifest content_scripts
        console.log(`[Background] Page loaded on supported site: ${url.hostname}`);
      } catch (error) {
        console.log(`[Background] Could not process ${url.hostname}:`, error.message);
      }
    }
  }
});

// Context menu setup
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
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
  
  browser.contextMenus.create({
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
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToWatchlist' && info.selectionText) {
    const selectedText = info.selectionText.trim();
    
    if (selectedText.length > 0 && selectedText.length < 100) {
      // Add to watchlist
      browser.storage.sync.get(['watchlist']).then((result) => {
        const watchlist = result.watchlist || [];
        
        // Check if already exists (case insensitive)
        const exists = watchlist.some(item => 
          item.toLowerCase() === selectedText.toLowerCase()
        );
        
        if (!exists) {
          watchlist.push(selectedText);
          browser.storage.sync.set({ watchlist }).then(() => {
            handleWatchlistUpdate(watchlist);
            
            // Show notification
            browser.notifications.create({
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
    browser.storage.sync.get(['extensionEnabled']).then((result) => {
      const currentState = result.extensionEnabled !== false;
      const newState = !currentState;
      
      handleToggle(newState);
      
      // Show notification
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-shield.png',
        title: 'Spoiler Shield',
        message: newState ? 'Extension enabled' : 'Extension disabled'
      });
    });
  }
});

// Storage change listener
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.watchlist) {
      browser.storage.sync.get(['extensionEnabled']).then((result) => {
        const enabled = result.extensionEnabled !== false;
        updateBadgeForWatchlist(changes.watchlist.newValue || [], enabled);
      });
    }
    
    if (changes.extensionEnabled) {
      updateBadgeForState(changes.extensionEnabled.newValue);
    }
    
    // Always notify content scripts when storage changes
    notifyAllContentScripts();
  }
});

// Initialize badge on startup
browser.storage.sync.get(['watchlist', 'extensionEnabled']).then((result) => {
  const watchlist = result.watchlist || [];
  const enabled = result.extensionEnabled !== false;
  updateBadgeForWatchlist(watchlist, enabled);
});

// Alarm for periodic cleanup
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    console.log('[Background] Performing periodic cleanup');
    // Could clean up old data, update statistics, etc.
  }
});

// Set up periodic cleanup
browser.alarms.create('cleanup', { 
  delayInMinutes: 60, // Run every hour
  periodInMinutes: 60 
});

// Firefox doesn't need keep-alive mechanisms like Chrome MV3
// The background script is event-driven and persists naturally