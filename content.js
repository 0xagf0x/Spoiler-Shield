// Spoiler Shield - Ultra-Robust Reveal Button Version (v1.4)
console.log("[Spoiler Shield] Loading on", window.location.hostname);

// Prevent multiple initializations
if (window.spoilerShieldLoaded) {
  console.log("[Spoiler Shield] Already loaded, skipping");
} else {
  window.spoilerShieldLoaded = true;

class SpoilerShield {
  constructor() {
    this.watchlist = [];
    this.processedElements = new WeakSet();
    this.isActive = false;
    this.observers = [];
    this.scanTimeout = null;
    this.overlayCounter = 0;
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
      
      // Inject CSS for better overlay styling
      this.injectOverlayCSS();
      
      // Start scanning immediately
      this.scanPage();
      
      // Set up observers for dynamic content
      this.setupObservers();
      
      console.log("[Spoiler Shield] Initialized and active (v1.4)");
      
    } catch (error) {
      console.error("[Spoiler Shield] Initialization failed:", error);
    }
  }

  injectOverlayCSS() {
    // Remove existing styles first
    const existingStyle = document.getElementById('spoiler-shield-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'spoiler-shield-styles';
    style.textContent = `
      /* Force styles with maximum specificity */
      .spoiler-shield-wrapper {
        position: relative !important;
        display: block !important;
        isolation: isolate !important;
      }
      
      .spoiler-shield-overlay {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        background: rgba(20, 20, 20, 0.8) !important;
        backdrop-filter: blur(3px) !important;
        min-height: 80px !important;
        min-width: 120px !important;
        box-sizing: border-box !important;
      }
      
      .spoiler-shield-button {
        all: initial !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
        background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
        color: #ffffff !important;
        border: 3px solid #ffffff !important;
        padding: 14px 24px !important;
        border-radius: 30px !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.3) !important;
        transition: all 0.3s ease !important;
        white-space: nowrap !important;
        line-height: 1.2 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        text-decoration: none !important;
        text-transform: none !important;
        letter-spacing: 0.5px !important;
        position: relative !important;
        outline: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        max-width: none !important;
        min-width: 160px !important;
        height: auto !important;
        margin: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
      }
      
      .spoiler-shield-button:hover {
        background: linear-gradient(135deg, #ff5252, #d63031) !important;
        transform: scale(1.1) translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(255, 107, 107, 0.7), 0 0 0 3px rgba(255, 255, 255, 0.5) !important;
        border-color: #ffffff !important;
      }
      
      .spoiler-shield-button:active {
        transform: scale(1.05) translateY(-1px) !important;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.8) !important;
      }
      
      .spoiler-shield-blurred {
        filter: blur(12px) brightness(30%) contrast(70%) !important;
        transition: filter 0.4s ease !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        pointer-events: none !important;
      }
      
      .spoiler-shield-notification {
        position: absolute !important;
        top: 15px !important;
        right: 15px !important;
        background: linear-gradient(135deg, #00b894, #00a085) !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 20px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        z-index: 2147483647 !important;
        opacity: 1 !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 12px rgba(0, 184, 148, 0.4) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }

      /* Additional fallback styles for stubborn elements */
      [data-spoiler-blurred="true"] .spoiler-shield-overlay {
        display: flex !important;
        position: absolute !important;
        z-index: 2147483647 !important;
      }

      [data-spoiler-blurred="true"] .spoiler-shield-button {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    console.log("[Spoiler Shield] CSS injected successfully");
  }

  scanPage() {
    if (!this.isActive || this.watchlist.length === 0) return;

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }

    this.scanTimeout = setTimeout(() => {
      try {
        this.scanTextContent();
      } catch (error) {
        console.error("[Spoiler Shield] Scan error:", error);
      }
    }, 100);
  }

  scanTextContent() {
    const siteSelectors = this.getSiteSpecificSelectors();
    
    siteSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!this.processedElements.has(element)) {
            this.checkAndBlurElement(element);
          }
        });
      } catch (e) {
        console.warn("[Spoiler Shield] Failed selector:", selector, e.message);
      }
    });
  }

  getSiteSpecificSelectors() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('reddit.com')) {
      return [
        '[data-testid="post-container"]',
        '.Post',
        '[data-click="thing"]',
        '.thing',
        '.scrollerItem',
        'shreddit-post',
        '[slot="full-post-container"]',
        '.Comment',
        '.commentarea .comment',
        '[data-testid="comment"]'
      ];
    }
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return [
        '[data-testid="tweet"]',
        'article[data-testid="tweet"]',
        '[data-testid="cellInnerDiv"] article',
        '.tweet'
      ];
    }
    
    if (hostname.includes('facebook.com')) {
      return [
        '[data-pagelet="FeedUnit"]',
        '[role="article"]',
        '.userContentWrapper'
      ];
    }
    
    // Default selectors for testing and other sites
    return [
      'article',
      '.post',
      '.content',
      'h1', 'h2', 'h3',
      '.title',
      '.headline',
      'p'
    ];
  }

  checkAndBlurElement(element) {
    if (!element || this.processedElements.has(element)) return;
    
    this.processedElements.add(element);
    
    const text = this.extractTextContent(element);
    if (text.length < 3) return;
    
    const foundTerm = this.findMatchingTerm(text);

    if (foundTerm) {
      console.log(`[Spoiler Shield] Found "${foundTerm}" in text:`, text.substring(0, 100));
      this.blurElement(element, foundTerm);
    }
  }

  extractTextContent(element) {
    const clone = element.cloneNode(true);
    const scriptsAndStyles = clone.querySelectorAll('script, style, .spoiler-shield-overlay');
    scriptsAndStyles.forEach(el => el.remove());
    return (clone.textContent || '').toLowerCase().trim();
  }

  findMatchingTerm(text) {
    return this.watchlist.find(term => {
      const termLower = term.toLowerCase().trim();
      if (!termLower) return false;
      return text.includes(termLower) || this.fuzzyMatch(text, termLower);
    });
  }

  fuzzyMatch(text, term) {
    const variations = [
      term,
      `${term}s`,
      term.replace(/\s+/g, ''),
      term.replace(/\s+/g, '_'),
      term.replace(/\s+/g, '-')
    ];
    
    if (term.includes(' ')) {
      const words = term.split(' ').filter(word => word.length > 2);
      variations.push(...words);
    }
    
    return variations.some(variation => text.includes(variation));
  }

  blurElement(element, term) {
    if (element.dataset.spoilerBlurred) {
      console.log("[Spoiler Shield] Element already blurred, skipping");
      return;
    }
    
    this.overlayCounter++;
    const overlayId = `spoiler-overlay-${this.overlayCounter}`;
    
    console.log(`[Spoiler Shield] Blurring element for term: ${term}`);
    
    // Mark element
    element.dataset.spoilerBlurred = 'true';
    element.dataset.spoilerTerm = term;
    element.dataset.overlayId = overlayId;

    // Add wrapper class for positioning
    element.classList.add('spoiler-shield-wrapper');
    
    // Store original styles
    const originalStyles = {
      position: element.style.position,
      zIndex: element.style.zIndex,
      overflow: element.style.overflow
    };

    // Ensure proper positioning
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    
    // Prevent content from overflowing and hiding the button
    element.style.overflow = 'visible';

    // Apply blur effect
    element.classList.add('spoiler-shield-blurred');

    // Create overlay with maximum visibility
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'spoiler-shield-overlay';
    overlayContainer.id = overlayId;
    
    // Force display properties
    overlayContainer.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483647 !important;
      background: rgba(20, 20, 20, 0.8) !important;
      backdrop-filter: blur(3px) !important;
      pointer-events: auto !important;
      min-height: 80px !important;
      min-width: 120px !important;
    `;

    // Create ultra-visible button
    const revealButton = document.createElement('button');
    revealButton.className = 'spoiler-shield-button';
    revealButton.type = 'button';
    revealButton.innerHTML = `🚫 SHOW SPOILER 🚫`;
    revealButton.title = `Spoiler detected: "${term}" - Click to reveal`;
    
    // Force button visibility
    revealButton.style.cssText = `
      all: initial !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
      color: #ffffff !important;
      border: 3px solid #ffffff !important;
      padding: 14px 24px !important;
      border-radius: 30px !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.5) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      white-space: nowrap !important;
      line-height: 1.2 !important;
      text-align: center !important;
      min-width: 160px !important;
      opacity: 1 !important;
      visibility: visible !important;
      position: relative !important;
      margin: 0 !important;
      outline: none !important;
    `;

    // Click handler
    const revealHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log(`[Spoiler Shield] Revealing spoiler: ${term}`);
      
      // Remove all spoiler effects
      element.classList.remove('spoiler-shield-blurred', 'spoiler-shield-wrapper');
      
      // Restore original styles
      Object.keys(originalStyles).forEach(prop => {
        if (originalStyles[prop]) {
          element.style[prop] = originalStyles[prop];
        }
      });
      
      // Clean up data attributes
      delete element.dataset.spoilerBlurred;
      delete element.dataset.spoilerTerm;
      delete element.dataset.overlayId;
      
      // Remove overlay
      overlayContainer.remove();
      
      // Show notification
      this.showRevealNotification(element, term);
    };

    // Add multiple event listeners for reliability
    revealButton.addEventListener('click', revealHandler, { once: true });
    revealButton.addEventListener('touchstart', revealHandler, { once: true });
    overlayContainer.addEventListener('click', (e) => {
      if (e.target === overlayContainer) {
        revealHandler(e);
      }
    });

    // Assemble and insert
    overlayContainer.appendChild(revealButton);
    element.appendChild(overlayContainer);

    // Force a reflow to ensure visibility
    element.offsetHeight;
    overlayContainer.offsetHeight;
    revealButton.offsetHeight;

    console.log(`[Spoiler Shield] Successfully created overlay with ID: ${overlayId}`);
    console.log("[Spoiler Shield] Button element:", revealButton);
    console.log("[Spoiler Shield] Overlay element:", overlayContainer);
  }

  showRevealNotification(element, term) {
    const notification = document.createElement('div');
    notification.className = 'spoiler-shield-notification';
    notification.textContent = `✅ Spoiler Revealed!`;

    element.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
    }, 2500);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 2800);
  }

  setupObservers() {
    this.cleanupObservers();

    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && this.hasTextContent(node)) {
              this.checkAndBlurElement(node);
              shouldScan = true;
            }
          });
        }
      });

      if (shouldScan) {
        this.scanPage();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(mutationObserver);

    // Periodic scanning
    const intervalId = setInterval(() => {
      if (this.isActive) {
        this.scanPage();
      }
    }, 2000);

    this.observers.push({ disconnect: () => clearInterval(intervalId) });

    console.log("[Spoiler Shield] Observers set up");
  }

  hasTextContent(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const text = element.textContent?.trim() || '';
    return text.length > 5;
  }

  cleanupObservers() {
    this.observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers = [];
  }

  handleMessage(message) {
    if (message.action === 'updateWatchlist') {
      this.watchlist = message.watchlist || [];
      this.processedElements = new WeakSet();
      console.log("[Spoiler Shield] Watchlist updated:", this.watchlist);
      
      if (this.watchlist.length > 0) {
        this.isActive = true;
        this.removeAllBlurs();
        setTimeout(() => this.scanPage(), 200);
      } else {
        this.isActive = false;
        this.removeAllBlurs();
      }
    } else if (message.action === 'rescan') {
      this.processedElements = new WeakSet();
      this.removeAllBlurs();
      setTimeout(() => this.scanPage(), 200);
      console.log("[Spoiler Shield] Manual rescan completed");
    }
  }

  removeAllBlurs() {
    const blurredElements = document.querySelectorAll('[data-spoiler-blurred="true"], .spoiler-shield-blurred');
    blurredElements.forEach(element => {
      element.classList.remove('spoiler-shield-blurred', 'spoiler-shield-wrapper');
      
      delete element.dataset.spoilerBlurred;
      delete element.dataset.spoilerTerm;
      delete element.dataset.overlayId;
      
      const overlays = element.querySelectorAll('.spoiler-shield-overlay');
      overlays.forEach(overlay => overlay.remove());
    });
  }

  destroy() {
    this.cleanupObservers();
    this.removeAllBlurs();
    this.isActive = false;
    
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    const styleElement = document.getElementById('spoiler-shield-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }
}

// Initialize only once
if (!window.spoilerShieldInstance) {
  window.spoilerShieldInstance = new SpoilerShield();

  // Set up message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    window.spoilerShieldInstance.handleMessage(message);
    sendResponse({ success: true });
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.spoilerShieldInstance.initialize();
    });
  } else {
    window.spoilerShieldInstance.initialize();
  }

  // Cleanup when page unloads
  window.addEventListener('beforeunload', () => {
    window.spoilerShieldInstance.destroy();
    window.spoilerShieldInstance = null;
    window.spoilerShieldLoaded = false;
  });

  console.log("[Spoiler Shield] Content script loaded and ready (v1.4 - Ultra-Visible Button)");
}

} // End of spoilerShieldLoaded check