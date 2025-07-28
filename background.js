// Minimal Spoiler Shield Background Script - v1.1
console.log('[Background] Service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
  chrome.storage.sync.set({ watchlist: [] });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.type);
  sendResponse({ success: true });
});

console.log('[Background] Service worker ready');