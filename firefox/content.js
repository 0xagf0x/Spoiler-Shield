// Spoiler Shield - Firefox Version (v1.7)

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
      this.extensionEnabled = true;
      this.observers = [];
      this.scanTimeout = null;
      this.overlayCounter = 0;
      this.lastScrollY = 0;
      this.scrollTimeout = null;
      this.autoScanInterval = null;
      this.intersectionObserver = null;
      this.lastScanTime = 0;
      this.scanCooldown = 300;
      
      // Blacklisted elements that should NEVER be blurred
      this.elementBlacklist = new Set([
        'html', 'body', 'head', 'main', 'header', 'footer', 'nav', 
        'aside', 'section', 'div#root', 'div#app', 'div#main',
        '[role="main"]', '[role="banner"]', '[role="navigation"]',
        '.page', '.container', '.wrapper', '.layout'
      ]);
    }

    async initialize() {
      try {
        const result = await browser.storage.sync.get(["watchlist", "extensionEnabled"]);
        this.watchlist = result.watchlist || [];
        this.extensionEnabled = result.extensionEnabled !== false;

        if (!this.extensionEnabled) {
          return;
        }

        if (this.watchlist.length === 0) {
          return;
        }

        this.isActive = true;
        this.injectOverlayCSS();
        this.scanPage();
        this.setupObservers();
        this.setupScrollMonitoring();
        this.setupIntersectionObserver();
        this.setupAutoRescan();
      } catch (error) {
        console.error("[Spoiler Shield] Initialization failed:", error);
      }
    }

    injectOverlayCSS() {
      const existingStyle = document.getElementById("spoiler-shield-styles");
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement("style");
      style.id = "spoiler-shield-styles";
      style.textContent = `
      /* Enhanced styles with better z-index management */
      .spoiler-shield-wrapper {
        position: relative !important;
        display: block !important;
        isolation: isolate !important;
        /* Ensure wrapper doesn't interfere with button visibility */
        contain: layout style !important;
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
        /* Ultra-high z-index to ensure visibility */
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        background: rgba(20, 20, 20, 0.85) !important;
        backdrop-filter: blur(3px) !important;
        min-height: 60px !important;
        min-width: 100px !important;
        box-sizing: border-box !important;
        /* Prevent the overlay itself from being affected by parent transforms */
        transform: translateZ(0) !important;
      }
      
      .spoiler-shield-button {
        all: initial !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
        background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
        color: #ffffff !important;
        border: 3px solid #ffffff !important;
        padding: 12px 20px !important;
        border-radius: 25px !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        /* Maximum z-index */
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.6), 0 0 0 2px rgba(255, 255, 255, 0.4) !important;
        transition: all 0.2s ease !important;
        white-space: nowrap !important;
        line-height: 1.2 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        text-decoration: none !important;
        text-transform: none !important;
        letter-spacing: 0.3px !important;
        position: relative !important;
        outline: none !important;
        user-select: none !important;
        max-width: none !important;
        min-width: 120px !important;
        height: auto !important;
        margin: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateZ(0) !important;
        /* Ensure button stays on top */
        isolation: isolate !important;
      }
      
      .spoiler-shield-button:hover {
        background: linear-gradient(135deg, #ff5252, #d63031) !important;
        transform: translateZ(0) scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.8), 0 0 0 3px rgba(255, 255, 255, 0.6) !important;
      }
      
      .spoiler-shield-button:active {
        transform: translateZ(0) scale(1.02) !important;
        box-shadow: 0 3px 10px rgba(255, 107, 107, 0.9) !important;
      }
      
      .spoiler-shield-blurred {
        filter: blur(8px) brightness(40%) contrast(60%) !important;
        transition: filter 0.3s ease !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        pointer-events: none !important;
        /* Ensure blurred content doesn't interfere with overlay */
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Prevent blur from affecting the overlay and button */
      .spoiler-shield-blurred .spoiler-shield-overlay {
        filter: none !important;
        backdrop-filter: blur(3px) !important;
      }
      
      .spoiler-shield-blurred .spoiler-shield-button {
        filter: none !important;
      }
      
      .spoiler-shield-notification {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        background: linear-gradient(135deg, #53b269, #45a058) !important;
        color: white !important;
        padding: 6px 12px !important;
        border-radius: 15px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        z-index: 2147483647 !important;
        opacity: 1 !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 3px 10px rgba(83, 178, 105, 0.4) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }

      .spoiler-shield-scan-indicator {
        position: fixed !important;
        top: 20px !important;
        left: 20px !important;
        background: rgba(83, 178, 105, 0.9) !important;
        color: white !important;
        padding: 6px 12px !important;
        border-radius: 15px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        z-index: 2147483647 !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
        pointer-events: none !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }

      .spoiler-shield-scan-indicator.active {
        opacity: 1 !important;
      }
    `;
      document.head.appendChild(style);
    }

    // Enhanced element validation to prevent blurring large containers
    isValidTargetElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }

      // Check if element is in blacklist
      const tagName = element.tagName.toLowerCase();
      if (this.elementBlacklist.has(tagName)) {
        return false;
      }

      // Check if element matches blacklisted selectors
      for (const selector of this.elementBlacklist) {
        if (selector.startsWith('[') || selector.startsWith('.') || selector.startsWith('#')) {
          try {
            if (element.matches(selector)) {
              return false;
            }
          } catch (e) {
            // Invalid selector, skip
          }
        }
      }

      // Prevent blurring elements that are too large relative to viewport
      const rect = element.getBoundingClientRect();
      const viewportArea = window.innerWidth * window.innerHeight;
      const elementArea = rect.width * rect.height;
      
      // Don't blur elements that take up more than 70% of the viewport
      if (elementArea > viewportArea * 0.7) {
        console.log("[Spoiler Shield] Skipping large element:", element, `${Math.round(elementArea/viewportArea*100)}% of viewport`);
        return false;
      }

      // Don't blur elements that span the full width/height
      if (rect.width > window.innerWidth * 0.9 || rect.height > window.innerHeight * 0.9) {
        console.log("[Spoiler Shield] Skipping full-width/height element:", element);
        return false;
      }

      // Ensure element has substantial text content
      const text = this.extractTextContent(element);
      if (text.length < 5) {
        return false;
      }

      // Don't blur navigation, header, or footer elements
      const role = element.getAttribute('role');
      if (role && ['navigation', 'banner', 'contentinfo', 'main'].includes(role)) {
        return false;
      }

      // Don't blur elements with certain classes that indicate layout containers
      const className = element.className || '';
      const layoutClasses = ['container', 'wrapper', 'layout', 'page', 'main', 'content-wrapper', 'app', 'root'];
      if (layoutClasses.some(cls => className.toLowerCase().includes(cls))) {
        return false;
      }

      return true;
    }

    scanTextContent() {
      const siteSelectors = this.getSiteSpecificSelectors();
      let newElementsFound = 0;

      siteSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            if (!this.processedElements.has(element) && this.isValidTargetElement(element)) {
              this.checkAndBlurElement(element);
              newElementsFound++;
            }
          });
        } catch (e) {
          console.warn("[Spoiler Shield] Failed selector:", selector, e.message);
        }
      });
    }

    getSiteSpecificSelectors() {
      const hostname = window.location.hostname.toLowerCase();

      if (hostname.includes("reddit.com")) {
        return [
          // Focus on specific post content areas, not containers
          'h3[slot="title"]',
          '[data-testid="post-content"] h3',
          'faceplate-tracker[source="post_title"] h3',
          '.Post h3',
          '.thing .title a',
          '.entry .title a',
          
          // Individual comment content
          '.Comment .md',
          '[data-testid="comment"] .md',
        ];
      }

      if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
        return [
          // Only target tweet content in the main timeline and thread views
          'main[role="main"] [data-testid="tweetText"]',
          'section[role="region"] [data-testid="tweetText"]',
          
          // Tweet content in specific containers (avoid search/sidebar)
          '[data-testid="primaryColumn"] [data-testid="tweetText"]',
          '[aria-label*="Timeline"] [data-testid="tweetText"]',
          
          // Profile tweets
          '[data-testid="UserTweets"] [data-testid="tweetText"]',
          '[data-testid="UserMedia"] [data-testid="tweetText"]',
          
          // Thread view tweets
          'article[data-testid="tweet"][tabindex="-1"] [data-testid="tweetText"]',
        ];
      }

      if (hostname.includes("facebook.com")) {
        return [
          // Focus on post text content in news feed
          '[data-pagelet="FeedUnit"] [data-testid="story-body"] span',
          '.userContentWrapper .userContent',
          '[role="main"] [data-testid="story-body"]',
        ];
      }

      if (hostname.includes("youtube.com")) {
        return [
          // Video titles and descriptions only in main content
          'ytd-watch-metadata #title h1',
          'ytd-video-primary-info-renderer h1',
          '#meta-contents #title h1',
          
          // Video descriptions
          'ytd-expandable-video-description-body-renderer #content',
          '#description-text',
          
          // Comments
          'ytd-comment-renderer #content-text',
        ];
      }

      if (hostname.includes("instagram.com")) {
        return [
          // Main post content areas (but be very specific)
          'article div[role="button"] span[dir="auto"]', // Post captions
          'article h1', // Post titles if any
          
          // Post images and videos
          'article img[alt]', // Images with alt text
          'article video', // Videos
          
          // Story content
          'section img[alt]', // Story images
        ];
      }

      // Default selectors - very conservative
      return [
        // Only target obvious content areas
        'main h1', 'main h2', 'main h3',
        'article h1', 'article h2', 'article h3',
        '.post-title', '.entry-title', '.article-title',
        '.post-content h1', '.post-content h2', '.post-content h3',
      ];
    }

    blurElement(element, term) {
      if (element.dataset.spoilerBlurred || !this.extensionEnabled) {
        return;
      }

      // Final safety check
      if (!this.isValidTargetElement(element)) {
        console.log("[Spoiler Shield] Skipping invalid target:", element);
        return;
      }

      this.overlayCounter++;
      const overlayId = `spoiler-overlay-${this.overlayCounter}`;

      // Mark element
      element.dataset.spoilerBlurred = "true";
      element.dataset.spoilerTerm = term;
      element.dataset.overlayId = overlayId;

      // Add wrapper class for positioning
      element.classList.add("spoiler-shield-wrapper");

      // Store original styles
      const originalStyles = {
        position: element.style.position,
        zIndex: element.style.zIndex,
        overflow: element.style.overflow,
        isolation: element.style.isolation,
      };

      // Ensure proper positioning context
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.position === "static") {
        element.style.position = "relative";
      }

      // Create isolation context to prevent z-index conflicts
      element.style.isolation = "isolate";

      // Apply blur effect
      element.classList.add("spoiler-shield-blurred");

      // Create overlay with ultra-high z-index
      const overlayContainer = document.createElement("div");
      overlayContainer.className = "spoiler-shield-overlay";
      overlayContainer.id = overlayId;

      // Create highly visible button
      const revealButton = document.createElement("button");
      revealButton.className = "spoiler-shield-button";
      revealButton.type = "button";
      revealButton.innerHTML = `🛡️ SHOW CONTENT`;
      revealButton.title = `Spoiler detected: "${term}" - Click to reveal`;

      // Enhanced click handler with event capture
      const revealHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Remove all spoiler effects
        element.classList.remove(
          "spoiler-shield-blurred",
          "spoiler-shield-wrapper"
        );

        // Restore original styles
        Object.keys(originalStyles).forEach((prop) => {
          if (originalStyles[prop]) {
            element.style[prop] = originalStyles[prop];
          } else {
            element.style.removeProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
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

      // Multiple event listeners for maximum reliability
      revealButton.addEventListener("click", revealHandler, { once: true, capture: true });
      revealButton.addEventListener("touchstart", revealHandler, { once: true, passive: false });
      revealButton.addEventListener("pointerdown", revealHandler, { once: true });
      
      // Fallback: clicking the overlay background
      overlayContainer.addEventListener("click", (e) => {
        if (e.target === overlayContainer) {
          revealHandler(e);
        }
      }, { capture: true });

      // Assemble and insert
      overlayContainer.appendChild(revealButton);
      element.appendChild(overlayContainer);

      // Force reflow and ensure visibility
      requestAnimationFrame(() => {
        element.offsetHeight;
        overlayContainer.offsetHeight;
        revealButton.offsetHeight;
        
        // Double-check button visibility
        const buttonRect = revealButton.getBoundingClientRect();
        if (buttonRect.width === 0 || buttonRect.height === 0) {
          console.warn("[Spoiler Shield] Button not visible, removing blur:", element);
          revealHandler(new Event('click'));
        }
      });
    }

    setupScrollMonitoring() {
      let ticking = false;

      const handleScroll = () => {
        if (!ticking && this.isActive && this.extensionEnabled) {
          requestAnimationFrame(() => {
            const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
            const scrollDifference = Math.abs(currentScrollY - this.lastScrollY);

            if (scrollDifference > 150) {
              this.showScanIndicator();
              this.scanPage();
              this.lastScrollY = currentScrollY;
            }

            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      this.observers.push({
        disconnect: () => window.removeEventListener("scroll", handleScroll),
      });
    }

    setupIntersectionObserver() {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (!this.extensionEnabled) return;
          
          let shouldScan = false;
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.processedElements.has(entry.target)) {
              const text = this.extractTextContent(entry.target);
              if (text.length > 3) {
                shouldScan = true;
              }
            }
          });

          if (shouldScan) {
            this.scanPage();
          }
        },
        { root: null, rootMargin: "50px", threshold: 0.1 }
      );

      this.observeVisibleElements();
    }

    observeVisibleElements() {
      if (!this.extensionEnabled) return;
      
      const selectors = this.getSiteSpecificSelectors();
      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            if (!this.processedElements.has(element)) {
              this.intersectionObserver?.observe(element);
            }
          });
        } catch (e) {
          // Ignore failed selectors
        }
      });
    }

    setupAutoRescan() {
      if (this.autoScanInterval) {
        clearInterval(this.autoScanInterval);
      }

      this.autoScanInterval = setInterval(() => {
        if (this.isActive && this.extensionEnabled && document.visibilityState === "visible") {
          this.scanPage();
        }
      }, 2000);

      const visibilityHandler = () => {
        if (this.isActive && this.extensionEnabled && document.visibilityState === "visible") {
          setTimeout(() => this.scanPage(), 200);
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);

      this.observers.push({
        disconnect: () => document.removeEventListener("visibilitychange", visibilityHandler),
      });

      const focusHandler = () => {
        if (this.isActive && this.extensionEnabled) {
          setTimeout(() => this.scanPage(), 100);
        }
      };
      window.addEventListener("focus", focusHandler);

      this.observers.push({
        disconnect: () => window.removeEventListener("focus", focusHandler),
      });
    }

    showScanIndicator() {
      if (!this.extensionEnabled) return;
      
      const existingIndicator = document.querySelector(".spoiler-shield-scan-indicator");
      if (existingIndicator) {
        existingIndicator.remove();
      }

      const indicator = document.createElement("div");
      indicator.className = "spoiler-shield-scan-indicator";
      indicator.textContent = "🛡️ Scanning...";

      document.body.appendChild(indicator);
      setTimeout(() => indicator.classList.add("active"), 10);
      setTimeout(() => {
        indicator.classList.remove("active");
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.remove();
          }
        }, 300);
      }, 1000);
    }

    scanPage() {
      if (!this.isActive || !this.extensionEnabled || this.watchlist.length === 0) {
        return;
      }

      const now = Date.now();
      if (now - this.lastScanTime < this.scanCooldown) {
        return;
      }
      this.lastScanTime = now;

      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      this.scanTimeout = setTimeout(() => {
        try {
          this.scanTextContent();
          this.observeVisibleElements();
        } catch (error) {
          console.error("[Spoiler Shield] Scan error:", error);
        }
      }, 50);
    }

    checkAndBlurElement(element) {
      if (!element || this.processedElements.has(element) || !this.extensionEnabled) return;

      this.processedElements.add(element);

      // Handle images differently
      if (element.tagName.toLowerCase() === 'img' || element.tagName.toLowerCase() === 'video') {
        this.checkAndBlurMedia(element);
        return;
      }

      const text = this.extractTextContent(element);
      if (text.length < 3) return;

      const foundTerm = this.findMatchingTerm(text);

      if (foundTerm) {
        this.blurElement(element, foundTerm);
      }
    }

    checkAndBlurMedia(mediaElement) {
      if (!mediaElement || this.processedElements.has(mediaElement) || !this.extensionEnabled) return;

      // Check alt text for images
      let textToCheck = '';
      if (mediaElement.tagName.toLowerCase() === 'img') {
        textToCheck = (mediaElement.alt || '').toLowerCase();
      }

      // Check nearby text content (captions, titles)
      const parentArticle = mediaElement.closest('article');
      if (parentArticle) {
        const nearbyText = this.extractTextContent(parentArticle);
        textToCheck += ' ' + nearbyText;
      }

      // Also check data attributes that might contain content info
      const src = mediaElement.src || '';
      const dataSrc = mediaElement.getAttribute('data-src') || '';
      textToCheck += ' ' + src + ' ' + dataSrc;

      if (textToCheck.length < 3) return;

      const foundTerm = this.findMatchingTerm(textToCheck);
      if (foundTerm) {
        this.blurElement(mediaElement, foundTerm);
      }
    }

    extractTextContent(element) {
      const clone = element.cloneNode(true);
      const scriptsAndStyles = clone.querySelectorAll("script, style, .spoiler-shield-overlay");
      scriptsAndStyles.forEach((el) => el.remove());
      
      // For Instagram, also get hashtags and mentions which might be in data attributes
      let textContent = (clone.textContent || "").toLowerCase().trim();
      
      if (window.location.hostname.includes('instagram.com')) {
        // Check for hashtags and mentions in the element and its children
        const hashtagElements = clone.querySelectorAll('[href*="hashtag"], [href*="explore/tags"]');
        hashtagElements.forEach(el => {
          textContent += ' ' + (el.textContent || '').toLowerCase();
        });
      }
      
      return textContent;
    }

    findMatchingTerm(text) {
      return this.watchlist.find((term) => {
        const termLower = term.toLowerCase().trim();
        if (!termLower) return false;

        if (text.includes(termLower)) {
          return true;
        }

        if (this.fuzzyMatch(text, termLower)) {
          return true;
        }

        if (termLower.includes(" ")) {
          const words = termLower.split(" ").filter((word) => word.length > 2);
          const foundWords = words.filter((word) => text.includes(word));
          if (foundWords.length === words.length) {
            return true;
          }
        }

        return false;
      });
    }

    fuzzyMatch(text, term) {
      const variations = [
        term,
        `${term}s`,
        term.replace(/\s+/g, ""),
        term.replace(/\s+/g, "_"),
        term.replace(/\s+/g, "-"),
      ];

      if (term.includes(" ")) {
        const words = term.split(" ").filter((word) => word.length > 2);
        variations.push(...words);
      }

      return variations.some((variation) => text.includes(variation));
    }

    showRevealNotification(element, term) {
      const notification = document.createElement("div");
      notification.className = "spoiler-shield-notification";
      notification.textContent = `✅ Content Revealed!`;

      element.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(-10px)";
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
        if (!this.extensionEnabled) return;
        
        let shouldScan = false;

        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE && this.hasTextContent(node)) {
                this.checkAndBlurElement(node);
                if (!this.processedElements.has(node)) {
                  this.intersectionObserver?.observe(node);
                }
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
        subtree: true,
      });

      this.observers.push(mutationObserver);
    }

    hasTextContent(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      const text = element.textContent?.trim() || "";
      return text.length > 5;
    }

    cleanupObservers() {
      this.observers.forEach((observer) => {
        if (observer.disconnect) {
          observer.disconnect();
        }
      });
      this.observers = [];

      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
      }

      if (this.autoScanInterval) {
        clearInterval(this.autoScanInterval);
        this.autoScanInterval = null;
      }
    }

    handleMessage(message) {
      if (message.action === "updateWatchlist") {
        this.watchlist = message.watchlist || [];
        this.extensionEnabled = message.extensionEnabled !== false;
        this.processedElements = new WeakSet();

        this.removeAllBlurs();

        if (this.extensionEnabled && this.watchlist.length > 0) {
          this.isActive = true;
          this.injectOverlayCSS();
          if (this.observers.length === 0) {
            this.setupObservers();
            this.setupScrollMonitoring();
            this.setupIntersectionObserver();
            this.setupAutoRescan();
          }
          setTimeout(() => this.scanPage(), 200);
        } else {
          this.isActive = false;
        }
      } else if (message.action === "rescan") {
        if (this.extensionEnabled && this.watchlist.length > 0) {
          this.processedElements = new WeakSet();
          this.removeAllBlurs();
          setTimeout(() => this.scanPage(), 200);
        }
      }
    }

    removeAllBlurs() {
      const blurredElements = document.querySelectorAll(
        '[data-spoiler-blurred="true"], .spoiler-shield-blurred'
      );
      blurredElements.forEach((element) => {
        element.classList.remove("spoiler-shield-blurred", "spoiler-shield-wrapper");

        delete element.dataset.spoilerBlurred;
        delete element.dataset.spoilerTerm;
        delete element.dataset.overlayId;

        const overlays = element.querySelectorAll(".spoiler-shield-overlay");
        overlays.forEach((overlay) => overlay.remove());
      });
    }

    destroy() {
      this.cleanupObservers();
      this.removeAllBlurs();
      this.isActive = false;
      this.extensionEnabled = false;

      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
      }

      const styleElement = document.getElementById("spoiler-shield-styles");
      if (styleElement) {
        styleElement.remove();
      }

      const indicator = document.querySelector(".spoiler-shield-scan-indicator");
      if (indicator) {
        indicator.remove();
      }
    }
  }

  // Initialize only once
  if (!window.spoilerShieldInstance) {
    window.spoilerShieldInstance = new SpoilerShield();

    // Use browser API instead of chrome for Firefox compatibility
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      window.spoilerShieldInstance.handleMessage(message);
      sendResponse({ success: true });
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        window.spoilerShieldInstance.initialize();
      });
    } else {
      window.spoilerShieldInstance.initialize();
    }

    window.addEventListener("beforeunload", () => {
      window.spoilerShieldInstance.destroy();
      window.spoilerShieldInstance = null;
      window.spoilerShieldLoaded = false;
    });
  }
}