// // Minimal Spoiler Shield Background Script - v1.1
// console.log('[Background] Service worker loaded');

// chrome.runtime.onInstalled.addListener(() => {
//   console.log('[Background] Extension installed');
//   chrome.storage.sync.set({ watchlist: [] });
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log('[Background] Message received:', message.type);
//   sendResponse({ success: true });
// });

// console.log('[Background] Service worker ready');






// Enhanced Spoiler Shield Background Script - v1.2
console.log('[Background] Service worker loaded');

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  // Initialize storage with empty watchlist if not exists
  chrome.storage.sync.get(['watchlist'], (result) => {
    if (!result.watchlist) {
      chrome.storage.sync.set({ 
        watchlist: [],
        extensionEnabled: true,
        lastVersion: chrome.runtime.getManifest().version
      });
      console.log('[Background] Storage initialized');
    }
  });

  // Show welcome notification on first install
  if (details.reason === 'install') {
    chrome.action.setBadgeText({ text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    
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
      chrome.storage.sync.get(['watchlist'], (result) => {
        sendResponse({ watchlist: result.watchlist || [] });
      });
      return true; // Keep channel open for async response
      
    case 'spoilerDetected':
      handleSpoilerDetection(message.term, sender.tab);
      break;
      
    case 'extensionStatus':
      sendResponse({ 
        enabled: true,
        version: chrome.runtime.getManifest().version 
      });
      break;
      
    default:
      sendResponse({ success: true });
  }
});

// Handle watchlist updates
function handleWatchlistUpdate(watchlist) {
  console.log('[Background] Updating watchlist:', watchlist);
  
  // Update badge to show number of watched terms
  const badgeText = watchlist.length > 0 ? watchlist.length.toString() : '';
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  
  // Notify all content scripts of the update
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateWatchlist',
          watchlist: watchlist
        }).catch(() => {
          // Ignore errors for tabs without content script
        });
      }
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
              iconUrl: 'icons/icon1.png',
              title: 'Spoiler Shield',
              message: `Added "${selectedText}" to watchlist`
            });
          });
        }
      });
    }
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.watchlist) {
    console.log('[Background] Watchlist changed:', changes.watchlist.newValue);
    handleWatchlistUpdate(changes.watchlist.newValue || []);
  }
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

console.log('[Background] Service worker ready with enhanced features');