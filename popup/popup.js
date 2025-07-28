// popup/popup.js - Enhanced version

const input = document.getElementById('input');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('watchlist');

let currentWatchlist = [];

// Load existing watchlist on startup
chrome.storage.sync.get(['watchlist'], (res) => {
  currentWatchlist = res.watchlist || [];
  currentWatchlist.forEach(addToList);
  updateCounter();
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
  removeBtn.textContent = 'x';
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
  if (currentWatchlist.length > 0) {
    title.textContent = `Spoiler Shield (${currentWatchlist.length})`;
  } else {
    title.textContent = 'Spoiler Shield';
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
  // Notify all tabs with the updated watchlist
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateWatchlist',
        watchlist: currentWatchlist
      }).catch(() => {
        // Ignore errors for tabs without content script
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

// Add some quick suggestions
function addQuickSuggestions() {
  const suggestions = [
    'F1', 'Formula 1', 'Verstappen', 'Hamilton', 'Red Bull',
    'Premier League', 'Champions League', 'Messi', 'Ronaldo',
    'House of the Dragon', 'Rings of Power', 'Stranger Things',
    'Marvel', 'Star Wars', 'Game of Thrones', 'Breaking Bad',
    'Taylor Swift', 'Drake', 'Kanye', 'BTS', 'Beyonce',
    'Trump', 'Biden', 'Election', 'Politics'
  ];
  
  const quickDiv = document.createElement('div');
  quickDiv.className = 'quick-suggestions';
  quickDiv.innerHTML = '<p style="margin: 10px 0 5px 0; font-size: 12px; opacity: 0.8;">Quick add:</p>';
  
  const suggestionContainer = document.createElement('div');
  suggestionContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 15px;
  `;
  
  // Add first 8 suggestions as buttons
  suggestions.slice(0, 8).forEach(suggestion => {
    const btn = document.createElement('button');
    btn.textContent = suggestion;
    btn.style.cssText = `
      padding: 4px 8px;
      font-size: 10px;
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 12px;
      color: white;
      cursor: pointer;
      transition: background 0.2s;
    `;
    
    btn.addEventListener('click', () => {
      input.value = suggestion;
      addItem();
    });
    
    btn.addEventListener('mouseover', () => {
      btn.style.background = 'rgba(255,255,255,0.3)';
    });
    
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'rgba(255,255,255,0.2)';
    });
    
    suggestionContainer.appendChild(btn);
  });
  
  quickDiv.appendChild(suggestionContainer);
  
  // Insert after the input section
  const content = document.getElementById('content');
  const firstP = content.querySelector('p');
  firstP.parentNode.insertBefore(quickDiv, list);
}

// Add rescan button
function addRescanButton() {
  const rescanBtn = document.createElement('button');
  rescanBtn.textContent = 'Rescan Current Page';
  rescanBtn.style.cssText = `
    width: 100%;
    padding: 8px;
    margin-top: 10px;
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 12px;
  `;
  
  rescanBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'rescan' })
          .then(() => showToast('Page rescanned!'))
          .catch(() => showToast('Could not rescan page'));
      }
    });
  });
  
  document.getElementById('content').appendChild(rescanBtn);
}

// Initialize enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  addQuickSuggestions();
  addRescanButton();
});