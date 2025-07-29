// Spoiler Shield - Auto-Rescan Enhanced Version with Toggle Support (v1.6)

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
      this.extensionEnabled = true; // New property to track global toggle
      this.observers = [];
      this.scanTimeout = null;
      this.overlayCounter = 0;
      this.lastScrollY = 0;
      this.scrollTimeout = null;
      this.autoScanInterval = null;
      this.intersectionObserver = null;
      this.lastScanTime = 0;
      this.scanCooldown = 300; // Minimum time between scans (ms)
    }

    async initialize() {
      try {
        // Get watchlist and extension state from storage
        const result = await chrome.storage.sync.get(["watchlist", "extensionEnabled"]);
        this.watchlist = result.watchlist || [];
        this.extensionEnabled = result.extensionEnabled !== false; // Default to true if not set

        // Only activate if extension is enabled and watchlist has items
        if (!this.extensionEnabled) {
          return;
        }

        if (this.watchlist.length === 0) {
          return;
        }

        this.isActive = true;

        // Inject CSS for better overlay styling
        this.injectOverlayCSS();

        // Start scanning immediately
        this.scanPage();

        // Set up all monitoring systems
        this.setupObservers();
        this.setupScrollMonitoring();
        this.setupIntersectionObserver();
        this.setupAutoRescan();
      } catch (error) {
        console.error("[Spoiler Shield] Initialization failed:", error);
      }
    }

    injectOverlayCSS() {
      // Remove existing styles first
      const existingStyle = document.getElementById("spoiler-shield-styles");
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement("style");
      style.id = "spoiler-shield-styles";
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
        background: linear-gradient(135deg, #53b269, #45a058) !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 20px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        z-index: 2147483647 !important;
        opacity: 1 !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 12px rgba(83, 178, 105, 0.4) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      }

      /* Auto-scan indicator */
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
    }

    setupScrollMonitoring() {
      let ticking = false;

      const handleScroll = () => {
        if (!ticking && this.isActive && this.extensionEnabled) {
          requestAnimationFrame(() => {
            const currentScrollY =
              window.pageYOffset || document.documentElement.scrollTop;
            const scrollDifference = Math.abs(
              currentScrollY - this.lastScrollY
            );

            // Trigger scan if user scrolled more than 150px (more sensitive)
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

      // Throttled scroll listener
      window.addEventListener("scroll", handleScroll, { passive: true });

      // Store for cleanup
      this.observers.push({
        disconnect: () => window.removeEventListener("scroll", handleScroll),
      });
    }

    setupIntersectionObserver() {
      // Monitor when new elements come into view
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (!this.extensionEnabled) return;
          
          let shouldScan = false;

          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              !this.processedElements.has(entry.target)
            ) {
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
        {
          root: null,
          rootMargin: "50px",
          threshold: 0.1,
        }
      );

      // Start observing existing elements
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
      // Clear any existing interval first
      if (this.autoScanInterval) {
        clearInterval(this.autoScanInterval);
      }

      // Automatic rescan every 2 seconds when page is active (more frequent)
      this.autoScanInterval = setInterval(() => {
        if (this.isActive && this.extensionEnabled && document.visibilityState === "visible") {
          this.scanPage();
        }
      }, 2000);

      // Rescan when page becomes visible again
      const visibilityHandler = () => {
        if (this.isActive && this.extensionEnabled && document.visibilityState === "visible") {
          setTimeout(() => this.scanPage(), 200);
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);

      // Store for cleanup
      this.observers.push({
        disconnect: () =>
          document.removeEventListener("visibilitychange", visibilityHandler),
      });

      // Rescan when window regains focus
      const focusHandler = () => {
        if (this.isActive && this.extensionEnabled) {
          setTimeout(() => this.scanPage(), 100);
        }
      };
      window.addEventListener("focus", focusHandler);

      // Store for cleanup
      this.observers.push({
        disconnect: () => window.removeEventListener("focus", focusHandler),
      });
    }

    showScanIndicator() {
      if (!this.extensionEnabled) return;
      
      // Remove existing indicator
      const existingIndicator = document.querySelector(
        ".spoiler-shield-scan-indicator"
      );
      if (existingIndicator) {
        existingIndicator.remove();
      }

      // Create new indicator
      const indicator = document.createElement("div");
      indicator.className = "spoiler-shield-scan-indicator";
      indicator.textContent = "🛡️ Scanning...";

      document.body.appendChild(indicator);

      // Show indicator
      setTimeout(() => indicator.classList.add("active"), 10);

      // Hide after 1 second
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

      // Throttle scanning to prevent too frequent calls
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
          this.observeVisibleElements(); // Re-observe new elements
        } catch (error) {
          console.error("[Spoiler Shield] Scan error:", error);
        }
      }, 50); // Reduced delay for faster scanning
    }

    scanTextContent() {
      const siteSelectors = this.getSiteSpecificSelectors();
      let newElementsFound = 0;

      siteSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element) => {
            if (!this.processedElements.has(element)) {
              // Debug: log what text we're checking
              const text = this.extractTextContent(element);
              if (text.length > 3) {
                this.checkAndBlurElement(element);
                newElementsFound++;
              }
            }
          });
        } catch (e) {
          console.warn(
            "[Spoiler Shield] Failed selector:",
            selector,
            e.message
          );
        }
      });
    }

    getSiteSpecificSelectors() {
      const hostname = window.location.hostname.toLowerCase();

      if (hostname.includes("reddit.com")) {
        return [
          // Main post containers
          '[data-testid="post-container"]',
          ".Post",
          '[data-click="thing"]',
          ".thing",
          ".scrollerItem",
          "shreddit-post",
          '[slot="full-post-container"]',

          // Individual post elements that contain titles
          'h3[slot="title"]',
          '[data-testid="post-content"]',
          'faceplate-tracker[source="post_title"]',
          'h1[slot="title"]',
          'h2[slot="title"]',

          // Reddit's new design selectors
          'div[data-testid="post-container"] h3',
          'div[data-testid="post-container"] [slot="title"]',
          "article h3",
          'article [data-click-id="text"]',

          // Legacy Reddit
          ".title a.title",
          ".entry .title a",

          // Comments
          ".Comment",
          ".commentarea .comment",
          '[data-testid="comment"]',

          // Fallback selectors for any missed content
          '[data-adclicklocation="title"]',
          '[data-click-id="body"]',
        ];
      }

      if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
        return [
          '[data-testid="tweet"]',
          'article[data-testid="tweet"]',
          '[data-testid="cellInnerDiv"] article',
          ".tweet",
          // Additional Twitter/X selectors
          '[data-testid="tweetText"]',
          '[role="group"][aria-labelledby]',
        ];
      }

      if (hostname.includes("facebook.com")) {
        return [
          '[data-pagelet="FeedUnit"]',
          '[role="article"]',
          ".userContentWrapper",
          // Additional Facebook selectors
          '[data-testid="story-body"]',
          ".story_body_container",
        ];
      }

      if (hostname.includes("youtube.com")) {
        return [
          "#video-title",
          ".ytd-video-meta-block",
          "#content-text",
          "#description-text",
          "yt-formatted-string.ytd-video-primary-info-renderer",
          ".ytd-comment-renderer",
        ];
      }

      if (hostname.includes("instagram.com")) {
        return [
          'article[role="presentation"]',
          "._a9zs",
          "._ae2s",
          ".x1i10hfl",
        ];
      }

      // Default selectors for testing and other sites
      return [
        "article",
        ".post",
        ".content",
        "h1",
        "h2",
        "h3",
        ".title",
        ".headline",
        "p",
        ".feed-item",
        ".story",
        ".entry",
      ];
    }

    checkAndBlurElement(element) {
      if (!element || this.processedElements.has(element) || !this.extensionEnabled) return;

      this.processedElements.add(element);

      const text = this.extractTextContent(element);
      if (text.length < 3) return;

      const foundTerm = this.findMatchingTerm(text);

      if (foundTerm) {
        this.blurElement(element, foundTerm);
      }
    }

    extractTextContent(element) {
      const clone = element.cloneNode(true);
      const scriptsAndStyles = clone.querySelectorAll(
        "script, style, .spoiler-shield-overlay"
      );
      scriptsAndStyles.forEach((el) => el.remove());
      return (clone.textContent || "").toLowerCase().trim();
    }

    findMatchingTerm(text) {
      return this.watchlist.find((term) => {
        const termLower = term.toLowerCase().trim();
        if (!termLower) return false;

        // Direct match
        if (text.includes(termLower)) {
          return true;
        }

        // Try fuzzy matching
        if (this.fuzzyMatch(text, termLower)) {
          return true;
        }

        // For multi-word terms like "Formula 1", also try matching individual significant words
        if (termLower.includes(" ")) {
          const words = termLower.split(" ").filter((word) => word.length > 2);
          // If we find all significant words, consider it a match
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

    blurElement(element, term) {
      if (element.dataset.spoilerBlurred || !this.extensionEnabled) {
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
      };

      // Ensure proper positioning
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.position === "static") {
        element.style.position = "relative";
      }

      // Prevent content from overflowing and hiding the button
      element.style.overflow = "visible";

      // Apply blur effect
      element.classList.add("spoiler-shield-blurred");

      // Create overlay with maximum visibility
      const overlayContainer = document.createElement("div");
      overlayContainer.className = "spoiler-shield-overlay";
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
      const revealButton = document.createElement("button");
      revealButton.className = "spoiler-shield-button";
      revealButton.type = "button";
      revealButton.innerHTML = `🚫 SHOW SPOILER 🚫`;
      revealButton.title = `Spoiler detected: "${term}" - Click to reveal`;

      // Don't override with inline styles - let CSS classes handle it

      // Click handler
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
      revealButton.addEventListener("click", revealHandler, { once: true });
      revealButton.addEventListener("touchstart", revealHandler, {
        once: true,
      });
      overlayContainer.addEventListener("click", (e) => {
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
    }

    showRevealNotification(element, term) {
      const notification = document.createElement("div");
      notification.className = "spoiler-shield-notification";
      notification.textContent = `✅ Spoiler Revealed!`;

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
              if (
                node.nodeType === Node.ELEMENT_NODE &&
                this.hasTextContent(node)
              ) {
                this.checkAndBlurElement(node);
                // Also observe the new element with intersection observer
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

        // Remove all existing blurs first
        this.removeAllBlurs();

        if (this.extensionEnabled && this.watchlist.length > 0) {
          this.isActive = true;
          // Reinject CSS in case it was removed
          this.injectOverlayCSS();
          // Set up observers if not already active
          if (this.observers.length === 0) {
            this.setupObservers();
            this.setupScrollMonitoring();
            this.setupIntersectionObserver();
            this.setupAutoRescan();
          }
          setTimeout(() => this.scanPage(), 200);
        } else {
          this.isActive = false;
          // Don't clean up observers completely, just deactivate
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
        element.classList.remove(
          "spoiler-shield-blurred",
          "spoiler-shield-wrapper"
        );

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

      // Clean up scan indicator
      const indicator = document.querySelector(
        ".spoiler-shield-scan-indicator"
      );
      if (indicator) {
        indicator.remove();
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
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        window.spoilerShieldInstance.initialize();
      });
    } else {
      window.spoilerShieldInstance.initialize();
    }

    // Cleanup when page unloads
    window.addEventListener("beforeunload", () => {
      window.spoilerShieldInstance.destroy();
      window.spoilerShieldInstance = null;
      window.spoilerShieldLoaded = false;
    });
  }
}