// Spoiler Shield - Fixed Version (v1.2)
console.log("[Spoiler Shield] Loading on", window.location.hostname);

class SpoilerShield {
  constructor() {
    this.watchlist = [];
    this.processedElements = new WeakSet(); // Use WeakSet for better memory management
    this.isActive = false;
    this.observers = [];
    this.scanTimeout = null;
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
      
      console.log("[Spoiler Shield] Initialized and active (v1.2)");
      
    } catch (error) {
      console.error("[Spoiler Shield] Initialization failed:", error);
    }
  }

  scanPage() {
    if (!this.isActive || this.watchlist.length === 0) return;

    // Clear any pending scan
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }

    this.scanTimeout = setTimeout(() => {
      try {
        this.scanTextContent();
      } catch (error) {
        console.error("[Spoiler Shield] Scan error:", error);
      }
    }, 50); // Small delay to batch rapid scans
  }

  scanTextContent() {
    // Site-specific selectors for better targeting
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
        // Skip if selector fails
        console.warn("[Spoiler Shield] Failed selector:", selector, e.message);
      }
    });
  }

  getSiteSpecificSelectors() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('reddit.com')) {
      return [
        // Reddit post containers
        '[data-testid="post-container"]',
        '.Post',
        '[data-click="thing"]',
        '.thing',
        '.scrollerItem',
        'shreddit-post',
        '[slot="full-post-container"]',
        // Reddit comments
        '.Comment',
        '.commentarea .comment',
        '[data-testid="comment"]'
      ];
    }
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return [
        // Twitter/X tweet containers
        '[data-testid="tweet"]',
        'article[data-testid="tweet"]',
        '[data-testid="cellInnerDiv"] article',
        '.tweet',
        // Twitter timeline items
        '[data-testid="primaryColumn"] section > div > div'
      ];
    }
    
    if (hostname.includes('facebook.com')) {
      return [
        // Facebook post containers
        '[data-pagelet="FeedUnit"]',
        '[role="article"]',
        '.userContentWrapper',
        '[data-testid="story-subtitle"]',
        '.story_body_container'
      ];
    }
    
    if (hostname.includes('youtube.com')) {
      return [
        // YouTube video items
        'ytd-video-renderer',
        'ytd-rich-item-renderer',
        'ytd-grid-video-renderer',
        'ytd-compact-video-renderer',
        // YouTube comments
        'ytd-comment-renderer',
        '#content-text'
      ];
    }
    
    if (hostname.includes('instagram.com')) {
      return [
        // Instagram post containers
        'article',
        '[role="button"] article',
        '._aamj', // Instagram post class
        '._ab6-' // Instagram story class
      ];
    }
    
    // Default selectors for other sites
    return [
      // General content containers
      'article',
      '.post',
      '.tweet',
      '.story',
      '.news-item',
      '.feed-item',
      '.content-item',
      // Headings and text content
      'h1', 'h2', 'h3',
      '.title',
      '.headline',
      '.post-title',
      // Paragraphs in content areas
      '.content p',
      '.post-content p',
      '.article-content p',
      '.description'
    ];
  }

  checkAndBlurElement(element) {
    if (!element || this.processedElements.has(element)) return;
    
    // Mark as processed immediately to prevent duplicate processing
    this.processedElements.add(element);
    
    const text = this.extractTextContent(element);
    if (text.length < 3) return; // Skip very short text
    
    // Check if any watchlist term appears in the text
    const foundTerm = this.findMatchingTerm(text);

    if (foundTerm) {
      console.log(`[Spoiler Shield] Found "${foundTerm}" in text, blurring element`);
      this.blurElement(element, foundTerm);
    }
  }

  extractTextContent(element) {
    // Get text content but exclude certain elements
    const clone = element.cloneNode(true);
    
    // Remove script and style elements
    const scriptsAndStyles = clone.querySelectorAll('script, style');
    scriptsAndStyles.forEach(el => el.remove());
    
    return (clone.textContent || '').toLowerCase().trim();
  }

  findMatchingTerm(text) {
    return this.watchlist.find(term => {
      const termLower = term.toLowerCase().trim();
      if (!termLower) return false;
      
      // Exact match
      if (text.includes(termLower)) return true;
      
      // Fuzzy matching for variations
      return this.fuzzyMatch(text, termLower);
    });
  }

  fuzzyMatch(text, term) {
    const variations = this.generateVariations(term);
    return variations.some(variation => text.includes(variation));
  }

  generateVariations(term) {
    const variations = [term];
    
    // Add common variations
    variations.push(`${term}s`); // plural
    variations.push(term.replace(/\s+/g, '')); // no spaces
    variations.push(term.replace(/\s+/g, '_')); // underscores
    variations.push(term.replace(/\s+/g, '-')); // hyphens
    
    // For multi-word terms, add individual words if they're significant
    if (term.includes(' ')) {
      const words = term.split(' ').filter(word => word.length > 2);
      variations.push(...words);
    }
    
    return variations;
  }

  blurElement(element, term) {
    if (element.dataset.spoilerBlurred) return;
    
    // Store original styles and state
    const originalStyles = {
      filter: element.style.filter || '',
      transition: element.style.transition || '',
      cursor: element.style.cursor || '',
      position: element.style.position || '',
      zIndex: element.style.zIndex || '',
      userSelect: element.style.userSelect || ''
    };
    
    element.dataset.spoilerBlurred = 'true';
    element.dataset.spoilerTerm = term;

    // Apply blur effect
    element.style.filter = 'blur(8px) brightness(30%)';
    element.style.transition = 'filter 0.3s ease';
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';
    
    // Ensure element has relative positioning for overlay
    if (!element.style.position || element.style.position === 'static') {
      element.style.position = 'relative';
    }

    // Create overlay container that sits above the blur
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'spoiler-shield-overlay';
    overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999 !important;
      pointer-events: auto;
      background: rgba(0, 0, 0, 0.1);
    `;

    // Create the reveal button
    const revealButton = document.createElement('button');
    revealButton.style.cssText = `
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 1000000 !important;
      pointer-events: auto;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      transition: all 0.2s ease;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    revealButton.innerHTML = `🛡️ Show Spoiler`;
    
    // Add hover effects
    revealButton.addEventListener('mouseenter', () => {
      revealButton.style.transform = 'scale(1.05)';
      revealButton.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)';
    });
    
    revealButton.addEventListener('mouseleave', () => {
      revealButton.style.transform = 'scale(1)';
      revealButton.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
    });

    // Click handler to reveal THIS specific element only
    const revealHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Restore original styles
      Object.keys(originalStyles).forEach(prop => {
        element.style[prop] = originalStyles[prop];
      });
      
      // Remove spoiler data attributes
      delete element.dataset.spoilerBlurred;
      delete element.dataset.spoilerTerm;
      
      // Remove overlay
      overlayContainer.remove();
      
      // Show brief success notification
      this.showRevealNotification(element, term);
      
      console.log(`[Spoiler Shield] Revealed spoiler: ${term}`);
    };

    revealButton.addEventListener('click', revealHandler);
    
    // Also allow clicking the overlay background to reveal
    overlayContainer.addEventListener('click', (e) => {
      if (e.target === overlayContainer) {
        revealHandler(e);
      }
    });

    // Assemble the overlay
    overlayContainer.appendChild(revealButton);
    element.appendChild(overlayContainer);

    console.log(`[Spoiler Shield] Blurred element containing: ${term}`);
  }

  showRevealNotification(element, term) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: 600;
      z-index: 1000000;
      opacity: 1;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      white-space: nowrap;
      pointer-events: none;
    `;
    notification.textContent = `✓ Spoiler Revealed`;

    element.appendChild(notification);

    // Animate and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
    }, 2000);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 2300);
  }

  setupObservers() {
    // Clean up existing observers
    this.cleanupObservers();

    // Main mutation observer for dynamic content
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the new node or its children contain text content
              if (this.hasTextContent(node)) {
                // Scan the new element immediately
                this.checkAndBlurElement(node);
                
                // Also scan child elements that might be content containers
                const childElements = node.querySelectorAll(this.getSiteSpecificSelectors().join(','));
                childElements.forEach(child => this.checkAndBlurElement(child));
                
                shouldScan = true;
              }
            }
          });
        }
      });

      if (shouldScan) {
        // Debounced full page scan for any elements we might have missed
        this.scanPage();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    this.observers.push(mutationObserver);

    // Intersection observer for elements entering viewport
    if ('IntersectionObserver' in window) {
      const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.processedElements.has(entry.target)) {
            this.checkAndBlurElement(entry.target);
          }
        });
      }, {
        rootMargin: '100px' // Start checking elements 100px before they enter viewport
      });

      // Observe all existing content elements
      this.getSiteSpecificSelectors().forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => intersectionObserver.observe(el));
        } catch (e) {
          // Skip failed selectors
        }
      });

      this.observers.push(intersectionObserver);
    }

    // Scroll-based scanning for infinite scroll
    let scrollTimeout;
    const scrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.scanPage();
      }, 150);
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Focus-based scanning (when user returns to tab)
    const focusHandler = () => {
      setTimeout(() => this.scanPage(), 300);
    };
    
    window.addEventListener('focus', focusHandler);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => this.scanPage(), 300);
      }
    });

    console.log("[Spoiler Shield] Enhanced observers set up for dynamic content");
  }

  hasTextContent(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    const text = element.textContent?.trim() || '';
    return text.length > 5; // Minimum text length to be considered content
  }

  cleanupObservers() {
    this.observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers = [];
  }

  // Handle messages from popup
  handleMessage(message) {
    if (message.action === 'updateWatchlist') {
      this.watchlist = message.watchlist || [];
      this.processedElements = new WeakSet(); // Reset to re-scan with new terms
      console.log("[Spoiler Shield] Watchlist updated:", this.watchlist);
      
      if (this.watchlist.length > 0) {
        this.isActive = true;
        // Remove existing blurs that might not match new watchlist
        this.removeAllBlurs();
        setTimeout(() => this.scanPage(), 100);
      } else {
        this.isActive = false;
        this.removeAllBlurs();
      }
    } else if (message.action === 'rescan') {
      this.processedElements = new WeakSet();
      this.removeAllBlurs();
      setTimeout(() => this.scanPage(), 100);
      console.log("[Spoiler Shield] Manual rescan completed");
    }
  }

  removeAllBlurs() {
    // Remove all existing blurs
    const blurredElements = document.querySelectorAll('[data-spoiler-blurred="true"]');
    blurredElements.forEach(element => {
      // Restore styles
      element.style.filter = '';
      element.style.cursor = '';
      element.style.userSelect = '';
      
      // Remove data attributes
      delete element.dataset.spoilerBlurred;
      delete element.dataset.spoilerTerm;
      
      // Remove overlays
      const overlays = element.querySelectorAll('.spoiler-shield-overlay');
      overlays.forEach(overlay => overlay.remove());
    });
  }

  // Cleanup method
  destroy() {
    this.cleanupObservers();
    this.removeAllBlurs();
    this.isActive = false;
    
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
  }
}

// Initialize the spoiler shield
const spoilerShield = new SpoilerShield();

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  spoilerShield.handleMessage(message);
  sendResponse({ success: true });
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    spoilerShield.initialize();
  });
} else {
  spoilerShield.initialize();
}

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  spoilerShield.destroy();
});

console.log("[Spoiler Shield] Content script loaded and ready (v1.2 - Fixed)");