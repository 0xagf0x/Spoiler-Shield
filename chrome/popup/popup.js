// popup/popup.js - Chrome-compatible version

const input = document.getElementById('input');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('watchlist');

let currentWatchlist = [];
let extensionEnabled = true;

// Load existing watchlist and extension state on startup
chrome.storage.sync.get(['watchlist', 'extensionEnabled'], (res) => {
  currentWatchlist = res.watchlist || [];
  extensionEnabled = res.extensionEnabled !== false; // Default to true if not set
  
  currentWatchlist.forEach(addToList);
  updateCounter();
  updateToggleState();
});

// Add button click handler
addBtn.addEventListener('click', addItem);

// Enter key handler for input
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addItem();
  }
});

function addItem() {
  const value = input.value.trim();
  if (!value) return;

  // Check if item already exists (case insensitive)
  const exists = currentWatchlist.some(item => 
    item.toLowerCase() === value.toLowerCase()
  );

  if (exists) {
    showToast('Item already exists!');
    input.value = '';
    return;
  }

  // Add to local array
  currentWatchlist.push(value);
  
  // Save to storage
  chrome.storage.sync.set({ watchlist: currentWatchlist }, () => {
    addToList(value);
    input.value = '';
    updateCounter();
    
    // Notify content scripts
    notifyContentScripts();
    
    showToast('Added to watchlist!');
  });
}

function addToList(item) {
  const li = document.createElement('li');
  li.className = 'watchlist-item';
  
  // Create item content with remove button
  const itemText = document.createElement('span');
  itemText.textContent = item;
  itemText.className = 'item-text';
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.className = 'remove-btn';
  removeBtn.title = 'Remove item';
  
  // Remove functionality
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeItem(item, li);
  });
  
  li.appendChild(itemText);
  li.appendChild(removeBtn);
  list.appendChild(li);
}

function removeItem(item, listElement) {
  // Remove from array
  const index = currentWatchlist.indexOf(item);
  if (index > -1) {
    currentWatchlist.splice(index, 1);
  }
  
  // Remove from DOM
  listElement.remove();
  
  // Update storage
  chrome.storage.sync.set({ watchlist: currentWatchlist }, () => {
    updateCounter();
    notifyContentScripts();
    showToast('Removed from watchlist');
  });
}

function updateCounter() {
  const title = document.querySelector('h1');
  title.textContent = 'Spoiler Shield';

  const keywordsUsedValue = document.querySelector('[data-keywords-used-value]');

  if (currentWatchlist.length > 0) {
    keywordsUsedValue.textContent = currentWatchlist.length;
  } else {
    keywordsUsedValue.textContent = '0';
  }
  
  // Show empty state message
  if (currentWatchlist.length === 0 && list.children.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-state';
    emptyMessage.textContent = 'Add terms to protect yourself from spoilers!';
    list.appendChild(emptyMessage);
  } else {
    // Remove empty state message if it exists
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  }
}

function notifyContentScripts() {
  // Notify all tabs with the updated watchlist and extension state
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateWatchlist',
        watchlist: extensionEnabled ? currentWatchlist : [],
        extensionEnabled: extensionEnabled
      }, () => {
        // Ignore errors for tabs without content script
        if (chrome.runtime.lastError) {
          // Silently ignore - tab doesn't have content script
        }
      });
    });
  });
}

function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  // Add to body
  document.body.appendChild(toast);
  
  // Show and hide
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Toggle extension on/off
function toggleExtension() {
  extensionEnabled = !extensionEnabled;
  
  // Save state to storage
  chrome.storage.sync.set({ extensionEnabled }, () => {
    updateToggleState();
    notifyContentScripts();
    
    // Update badge in background
    chrome.runtime.sendMessage({
      action: 'toggleExtension',
      enabled: extensionEnabled
    });
  });
}

function updateToggleState() {
  const toggleBtn = document.getElementById('toggleBtn');
  const content = document.getElementById('content');
  
  if (toggleBtn) {
    toggleBtn.textContent = extensionEnabled ? 'ON' : 'OFF';
    toggleBtn.className = extensionEnabled ? 'toggle-btn enabled' : 'toggle-btn disabled';
    toggleBtn.title = extensionEnabled ? 'Click to disable Spoiler Shield' : 'Click to enable Spoiler Shield';
  }
  
  // Disable/enable controls based on state
  if (content) {
    content.style.opacity = extensionEnabled ? '1' : '0.5';
    input.disabled = !extensionEnabled;
    addBtn.disabled = !extensionEnabled;
    
    // Disable/enable remove buttons
    const removeButtons = document.querySelectorAll('.remove-btn');
    removeButtons.forEach(btn => {
      btn.disabled = !extensionEnabled;
    });
    
    // Disable/enable quick suggestion buttons
    const suggestionButtons = document.querySelectorAll('.quick-suggestions button');
    suggestionButtons.forEach(btn => {
      btn.disabled = !extensionEnabled;
    });
    
    // Disable/enable rescan button
    const rescanBtn = document.getElementById('rescanBtn');
    if (rescanBtn) {
      rescanBtn.disabled = !extensionEnabled;
    }
  }
}

// Add some quick suggestions
function addQuickSuggestions() {
  const suggestions = [
    'Formula 1', 'F1', 'Premier League', 'Champions League',
    'Stranger Things', 'House of the Dragon', 'Marvel', 'Star Wars'
  ];
  
  const quickDiv = document.createElement('div');
  quickDiv.className = 'quick-suggestions';
  
  const quickTitle = document.createElement('p');
  quickTitle.textContent = 'Quick add:';
  quickDiv.appendChild(quickTitle);
  
  const suggestionContainer = document.createElement('div');
  
  // Add first 8 suggestions as buttons
  suggestions.slice(0, 8).forEach(suggestion => {
    const btn = document.createElement('button');
    btn.textContent = suggestion;
    btn.type = 'button';
    
    btn.addEventListener('click', () => {
      if (!extensionEnabled) return;
      
      // Check if already exists
      const exists = currentWatchlist.some(item => 
        item.toLowerCase() === suggestion.toLowerCase()
      );
      
      if (exists) {
        showToast('Already in watchlist!');
        return;
      }
      
      input.value = suggestion;
      addItem();
    });
    
    suggestionContainer.appendChild(btn);
  });
  
  quickDiv.appendChild(suggestionContainer);
  
  // Insert after the add button
  const content = document.getElementById('content');
  content.insertBefore(quickDiv, list);
}

// Add toggle button
function addToggleButton() {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggleBtn';
  toggleBtn.className = 'toggle-btn enabled';
  toggleBtn.textContent = 'ON';
  toggleBtn.type = 'button';
  toggleBtn.title = 'Click to disable Spoiler Shield';
  
  toggleBtn.addEventListener('click', toggleExtension);
  
  // Insert at the top of content
  const content = document.getElementById('content');
  content.insertBefore(toggleBtn, content.firstChild);
}

// Add rescan button
function addRescanButton() {
  const rescanBtn = document.createElement('button');
  rescanBtn.id = 'rescanBtn';
  rescanBtn.textContent = 'Rescan Current Page';
  rescanBtn.type = 'button';
  rescanBtn.style.cssText = `
    width: 100%;
    padding: 10px;
    margin-top: 15px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.3);
  `;
  
  rescanBtn.addEventListener('click', () => {
    if (!extensionEnabled) {
      showToast('Enable Spoiler Shield first!');
      return;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'rescan' }, (response) => {
          if (chrome.runtime.lastError) {
            showToast('Could not rescan - try refreshing the page');
          } else {
            showToast('Page rescanned!');
          }
        });
      }
    });
  });
  
  rescanBtn.addEventListener('mouseenter', () => {
    if (extensionEnabled) {
      rescanBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      rescanBtn.style.transform = 'translateY(-1px)';
    }
  });
  
  rescanBtn.addEventListener('mouseleave', () => {
    rescanBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    rescanBtn.style.transform = 'translateY(0)';
  });
  
  document.getElementById('content').appendChild(rescanBtn);
}

// Add status indicator
function addStatusIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'status-indicator';
  indicator.id = 'statusIndicator';
  
  // Position it in the header
  const header = document.querySelector('h1');
  header.style.position = 'relative';
  header.appendChild(indicator);
  
  // Update indicator based on extension state
  function updateIndicator() {
    if (extensionEnabled && currentWatchlist.length > 0) {
      indicator.className = 'status-indicator';
      indicator.title = `Active - protecting from ${currentWatchlist.length} terms`;
    } else {
      indicator.className = 'status-indicator inactive';
      indicator.title = extensionEnabled ? 'No terms in watchlist' : 'Extension disabled';
    }
  }
  
  updateIndicator();
  
  // Update when state changes
  const originalUpdateToggleState = updateToggleState;
  updateToggleState = function() {
    originalUpdateToggleState();
    updateIndicator();
  };
  
  const originalUpdateCounter = updateCounter;
  updateCounter = function() {
    originalUpdateCounter();
    updateIndicator();
  };
}

// Initialize enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add all the enhanced UI elements
  addToggleButton();
  addQuickSuggestions();
  addRescanButton();
  addStatusIndicator();
  
  // Update the initial state
  updateToggleState();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to add item
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    addItem();
  }
  
  // Escape to clear input
  if (e.key === 'Escape') {
    input.value = '';
    input.blur();
  }
});

// Auto-focus input when popup opens
setTimeout(() => {
  if (extensionEnabled) {
    input.focus();
  }
}, 100);