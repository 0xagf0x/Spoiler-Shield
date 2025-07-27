// Spoiler Shield - Simple and Working Version
console.log("[Spoiler Shield] Loading on", window.location.hostname);

class SpoilerShield {
  constructor() {
    this.watchlist = [];
    this.processedElements = new Set();
    this.isActive = false;
  }

  async initialize() {
    try {
      // Get watchlist from storage
      const result = await chrome.storage.sync.get(['watchlist']);
      this.watchlist = result.watchlist || [];
      
      console.log("[Spoiler Shield] Watchlist loaded:", this.watchlist);
      
      if (this.watchlist.length === 0) {
        console.log("[Spoiler Shield] No watchlist items found");
        return;
      }

      this.isActive = true;
      
      // Start scanning immediately
      this.scanPage();
      
      // Set up observers for dynamic content
      this.setupObservers();
      
      // Rescan every 3 seconds for dynamic content
      setInterval(() => this.scanPage(), 3000);
      
      console.log("[Spoiler Shield] Initialized and active");
      
    } catch (error) {
      console.error("[Spoiler Shield] Initialization failed:", error);
    }
  }

  scanPage() {
    if (!this.isActive || this.watchlist.length === 0) return;

    try {
      // Find all text content and images on the page
      this.scanTextContent();
      this.scanImages();
    } catch (error) {
      console.error("[Spoiler Shield] Scan error:", error);
    }
  }

  scanTextContent() {
    // Common selectors for different sites
    const selectors = [
      // Reddit
      '.Post', '[data-test-id="post-content"]', '.usertext-body', '.title', 'h3',
      // Twitter/X  
      '[data-testid="tweet"]', '[data-testid="tweetText"]', 'article',
      // Facebook
      '[data-testid="post_message"]', '.userContent',
      // General
      '.post', '.content', '.comment', '.story', 'p', '.description'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => this.checkAndBlurElement(element));
    });
  }

  scanImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.dataset.spoilerChecked) {
        img.dataset.spoilerChecked = 'true';
        this.checkAndBlurImage(img);
      }
    });
  }

  checkAndBlurElement(element) {
    if (!element || this.processedElements.has(element)) return;
    
    const text = element.textContent?.toLowerCase() || '';
    if (text.length < 3) return; // Skip very short text
    
    // Check if any watchlist term appears in the text
    const foundTerm = this.watchlist.find(term => {
      const termLower = term.toLowerCase();
      return text.includes(termLower);
    });

    if (foundTerm) {
      console.log(`[Spoiler Shield] Found "${foundTerm}" in text, blurring element`);
      this.blurElement(element, foundTerm);
      this.processedElements.add(element);
    }
  }

  checkAndBlurImage(img) {
    if (!img.src || this.processedElements.has(img)) return;

    // Get context around the image
    const context = this.getImageContext(img);
    const allText = `${img.src} ${img.alt || ''} ${img.title || ''} ${context}`.toLowerCase();

    // Check if any watchlist term appears
    const foundTerm = this.watchlist.find(term => {
      const termLower = term.toLowerCase();
      return allText.includes(termLower);
    });

    if (foundTerm) {
      console.log(`[Spoiler Shield] Found "${foundTerm}" near image, blurring`);
      this.blurImage(img, foundTerm);
      this.processedElements.add(img);
    }
  }

  getImageContext(img) {
    try {
      // Get text from parent containers
      let parent = img.parentElement;
      let context = '';
      let levels = 0;

      while (parent && levels < 3) {
        const text = parent.textContent || '';
        if (text.length > context.length && text.length < 1000) {
          context = text;
        }
        parent = parent.parentElement;
        levels++;
      }

      return context;
    } catch (error) {
      return '';
    }
  }

  blurElement(element, term) {
    if (element.dataset.spoilerBlurred) return;
    element.dataset.spoilerBlurred = 'true';

    // Apply blur effect
    element.style.filter = 'blur(8px)';
    element.style.transition = 'filter 0.3s ease';
    element.style.cursor = 'pointer';
    element.style.position = 'relative';

    // Add click handler to reveal
    const revealHandler = (e) => {
      e.stopPropagation();
      element.style.filter = 'none';
      element.style.cursor = 'default';
      
      // Show brief notification
      this.showRevealNotification(element, term);
      
      // Remove click handler
      element.removeEventListener('click', revealHandler);
    };

    element.addEventListener('click', revealHandler);

    // Add hover effect
    element.addEventListener('mouseenter', () => {
      if (element.style.filter === 'blur(8px)') {
        element.style.filter = 'blur(4px)';
      }
    });

    element.addEventListener('mouseleave', () => {
      if (element.style.filter === 'blur(4px)') {
        element.style.filter = 'blur(8px)';
      }
    });

    console.log(`[Spoiler Shield] Blurred element containing: ${term}`);
  }

  blurImage(img, term) {
    if (img.dataset.spoilerBlurred) return;
    img.dataset.spoilerBlurred = 'true';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      max-width: 100%;
    `;

    // Insert wrapper and move image
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    // Apply blur
    img.style.filter = 'blur(15px)';
    img.style.transition = 'filter 0.3s ease';
    img.style.cursor = 'pointer';

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    overlay.innerHTML = `<div style="background: #6366f1; padding: 10px 20px; border-radius: 20px;">Spoiler Blocked</div>`;

    wrapper.appendChild(overlay);

    // Show overlay on hover
    wrapper.addEventListener('mouseenter', () => {
      overlay.style.opacity = '1';
    });

    wrapper.addEventListener('mouseleave', () => {
      overlay.style.opacity = '0';
    });

    // Click to reveal
    const revealHandler = (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      img.style.filter = 'none';
      overlay.style.opacity = '0';
      
      setTimeout(() => overlay.remove(), 300);
      
      this.showRevealNotification(wrapper, term);
    };

    overlay.addEventListener('click', revealHandler);
    img.addEventListener('click', revealHandler);

    console.log(`[Spoiler Shield] Blurred image for: ${term}`);
  }

  showRevealNotification(element, term) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: #10b981;
      color: white;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      opacity: 1;
      transition: opacity 2s ease;
    `;
    notification.textContent = `✓ Revealed (${term})`;

    element.style.position = 'relative';
    element.appendChild(notification);

    // Fade out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 2000);
    }, 2000);
  }

  setupObservers() {
    // Watch for new content being added
    const observer = new MutationObserver((mutations) => {
      let hasNewContent = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          hasNewContent = true;
        }
      });

      if (hasNewContent) {
        // Debounce scanning to avoid too frequent scans
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => this.scanPage(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log("[Spoiler Shield] Observer set up for dynamic content");
  }

  // Handle messages from popup
  handleMessage(message) {
    if (message.action === 'updateWatchlist') {
      this.watchlist = message.watchlist || [];
      this.processedElements.clear(); // Reset to re-scan with new terms
      console.log("[Spoiler Shield] Watchlist updated:", this.watchlist);
      
      if (this.watchlist.length > 0) {
        this.isActive = true;
        setTimeout(() => this.scanPage(), 100);
      } else {
        this.isActive = false;
      }
    } else if (message.action === 'rescan') {
      this.processedElements.clear();
      this.scanPage();
      console.log("[Spoiler Shield] Manual rescan completed");
    }
  }
}

// Initialize the spoiler shield
const spoilerShield = new SpoilerShield();

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  spoilerShield.handleMessage(message);
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    spoilerShield.initialize();
  });
} else {
  spoilerShield.initialize();
}

// Also initialize after a delay for dynamic content
setTimeout(() => {
  spoilerShield.initialize();
}, 1000);

console.log("[Spoiler Shield] Content script loaded and ready");