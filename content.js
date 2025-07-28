// Spoiler Shield - Text Only Version (v1.1)
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
      
      // More aggressive scanning for dynamic sites
      setInterval(() => this.scanPage(), 2000); // Every 2 seconds
      
      // Scan on scroll events (for infinite scroll)
      let scrollCount = 0;
      const scrollHandler = () => {
        scrollCount++;
        // Scan every 3rd scroll event to balance performance
        if (scrollCount % 3 === 0) {
          setTimeout(() => this.scanPage(), 300);
        }
      };
      
      window.addEventListener('scroll', scrollHandler, { passive: true });
      
      // Scan when page becomes visible again (tab switching)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          setTimeout(() => this.scanPage(), 500);
        }
      });
      
      console.log("[Spoiler Shield] Initialized and active (text-only mode)");
      
    } catch (error) {
      console.error("[Spoiler Shield] Initialization failed:", error);
    }
  }

  scanPage() {
    if (!this.isActive || this.watchlist.length === 0) return;

    try {
      // Only scan text content - images disabled for v1.1
      this.scanTextContent();
    } catch (error) {
      console.error("[Spoiler Shield] Scan error:", error);
    }
  }

  scanTextContent() {
    // Enhanced selectors for different sites
    const selectors = [
      // Reddit
      '.Post', '[data-test-id="post-content"]', '.usertext-body', '.title', 'h3',
      '.thing .title a', '.usertext .md p', '.live-timestamp-update',
      '[data-subreddit]', '.entry .title', '.link .title',
      '.scrollerItem', '.scrollable-content', // New Reddit infinite scroll
      
      // Twitter/X  
      '[data-testid="tweet"]', '[data-testid="tweetText"]', 'article',
      '[data-testid="User-Name"]', '.tweet-text', '.QuoteTweet-text',
      '[data-testid="cellInnerDiv"]', // Twitter timeline items
      
      // Facebook
      '[data-testid="post_message"]', '.userContent', '[role="article"]',
      '._5pbx', '.story_body_container', '[data-pagelet]',
      
      // YouTube
      '#video-title', '.ytd-video-meta-block', '#content-text', '.comment-text',
      '.video-title', '.style-scope ytd-video-primary-info-renderer',
      'ytd-rich-grid-media', 'ytd-video-renderer', // YouTube grid items
      
      // General news sites and content
      'h1', 'h2', 'h3', '.headline', '.title', '.post-title',
      '.article-title', '.entry-title', '.news-title',
      'p', '.content', '.post-content', '.article-content',
      '.comment', '.description', '.summary', '.excerpt',
      '.story', '.news-item', '.feed-item',
      
      // Dynamic content containers
      '[data-testid]', '.feed', '.timeline', '.stream',
      '.infinite-scroll-component', '.virtualized-list'
    ];

    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          this.checkAndBlurElement(element);
          
          // If we have intersection observer, also observe this element
          if (this.setupIntersectionObserver && !this.processedElements.has(element)) {
            this.setupIntersectionObserver.observe(element);
          }
        });
      } catch (e) {
        // Skip if selector fails
      }
    });

    // Also do a broader scan for any element with substantial text content
    const allElements = document.querySelectorAll('*');
    const textElements = Array.from(allElements).filter(el => {
      const text = el.textContent?.trim() || '';
      return text.length > 10 && text.length < 1000 && // Reasonable text length
             el.children.length === 0; // No child elements (likely a text node)
    });

    textElements.forEach(el => this.checkAndBlurElement(el));
  }

  checkAndBlurElement(element) {
    if (!element || this.processedElements.has(element)) return;
    
    const text = element.textContent?.toLowerCase() || '';
    if (text.length < 3) return; // Skip very short text
    
    // Check if any watchlist term appears in the text
    const foundTerm = this.watchlist.find(term => {
      const termLower = term.toLowerCase();
      // More flexible matching - check for partial matches and common variations
      return text.includes(termLower) || 
             this.fuzzyMatch(text, termLower);
    });

    if (foundTerm) {
      console.log(`[Spoiler Shield] Found "${foundTerm}" in text, blurring element`);
      this.blurElement(element, foundTerm);
      this.processedElements.add(element);
    }
  }

  fuzzyMatch(text, term) {
    // Handle common variations and partial matches
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
    
    // For multi-word terms, add individual words
    if (term.includes(' ')) {
      const words = term.split(' ');
      variations.push(...words.filter(word => word.length > 2));
    }
    
    return variations;
  }

  blurElement(element, term) {
    if (element.dataset.spoilerBlurred) return;
    element.dataset.spoilerBlurred = 'true';

    // Store original styles
    const originalFilter = element.style.filter || '';
    const originalTransition = element.style.transition || '';
    const originalCursor = element.style.cursor || '';

    // Apply blur effect with improved styling
    element.style.filter = 'blur(8px) brightness(30%)';
    element.style.transition = 'filter 0.3s ease';
    element.style.cursor = 'pointer';
    element.style.position = 'relative';
    element.style.userSelect = 'none';

    // Add subtle border to indicate it's interactive
    const originalBoxShadow = element.style.boxShadow || '';
    element.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.3)';

    // Create overlay with better styling
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    overlay.innerHTML = `🛡️ Spoiler Hidden`;

    element.appendChild(overlay);

    // Show overlay on hover
    element.addEventListener('mouseenter', () => {
      overlay.style.opacity = '1';
      element.style.filter = 'blur(6px) brightness(40%)';
    });

    element.addEventListener('mouseleave', () => {
      if (element.dataset.spoilerBlurred === 'true') {
        overlay.style.opacity = '0';
        element.style.filter = 'blur(8px) brightness(30%)';
      }
    });

    // Click handler to reveal
    const revealHandler = (e) => {
      e.stopPropagation();
      
      // Remove blur and restore original styles
      element.style.filter = originalFilter;
      element.style.cursor = originalCursor;
      element.style.boxShadow = originalBoxShadow;
      element.style.userSelect = '';
      element.dataset.spoilerBlurred = 'false';
      
      // Remove overlay
      overlay.remove();
      
      // Show brief notification
      this.showRevealNotification(element, term);
      
      // Remove click handler
      element.removeEventListener('click', revealHandler);
    };

    element.addEventListener('click', revealHandler);

    console.log(`[Spoiler Shield] Blurred element containing: ${term}`);
  }

  showRevealNotification(element, term) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 11px;
      font-weight: 600;
      z-index: 10000;
      opacity: 1;
      transition: opacity 2s ease;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      white-space: nowrap;
    `;
    notification.textContent = `✓ Revealed`;

    element.style.position = 'relative';
    element.appendChild(notification);

    // Fade out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 2000);
    }, 2000);
  }

  setupObservers() {
    // Watch for new content being added (more aggressive for dynamic sites)
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Immediately scan new elements that might contain text
              if (node.textContent && node.textContent.trim().length > 2) {
                this.checkAndBlurElement(node);
                // Also scan child elements
                this.scanElementAndChildren(node);
              }
              shouldScan = true;
            }
          });
        }
      });

      if (shouldScan) {
        // Much more aggressive scanning for dynamic content
        clearTimeout(this.quickScanTimeout);
        this.quickScanTimeout = setTimeout(() => this.scanPage(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false, // Don't watch attribute changes to reduce noise
      characterData: false // Don't watch text changes to reduce noise
    });

    // Also set up scroll-based scanning for infinite scroll sites
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.scanPage();
      }, 200);
    });

    // Set up intersection observer to catch elements entering viewport
    if ('IntersectionObserver' in window) {
      const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.processedElements.has(entry.target)) {
            this.checkAndBlurElement(entry.target);
          }
        });
      }, {
        rootMargin: '50px' // Start checking elements 50px before they enter viewport
      });

      // Observe all potential content elements
      this.setupIntersectionObserver = intersectionObserver;
    }

    console.log("[Spoiler Shield] Enhanced observers set up for dynamic content");
  }

  scanElementAndChildren(element) {
    // Scan an element and all its children immediately
    if (element && element.nodeType === Node.ELEMENT_NODE) {
      this.checkAndBlurElement(element);
      
      // Scan all child elements
      const children = element.querySelectorAll('*');
      children.forEach(child => {
        if (child.textContent && child.textContent.trim().length > 2) {
          this.checkAndBlurElement(child);
        }
      });
    }
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
        // Remove all existing blurs when watchlist is empty
        this.removeAllBlurs();
      }
    } else if (message.action === 'rescan') {
      this.processedElements.clear();
      this.scanPage();
      console.log("[Spoiler Shield] Manual rescan completed");
    }
  }

  removeAllBlurs() {
    // Remove all existing blurs when extension is disabled
    const blurredElements = document.querySelectorAll('[data-spoiler-blurred="true"]');
    blurredElements.forEach(element => {
      element.style.filter = '';
      element.style.cursor = '';
      element.style.boxShadow = '';
      element.style.userSelect = '';
      element.dataset.spoilerBlurred = 'false';
      
      // Remove any overlays
      const overlays = element.querySelectorAll('div[style*="spoiler"]');
      overlays.forEach(overlay => overlay.remove());
    });
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

console.log("[Spoiler Shield] Content script loaded and ready (v1.1 - Text Only)");