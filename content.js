// Enhanced Spoiler Shield with Image Recognition
console.log("[Spoiler Shield Vision] Loaded on", window.location.hostname);

class ImageSpoilerDetector {
  constructor() {
    this.mlReady = false;
    this.initializingML = false;
  }

  async initializeML() {
    if (this.mlReady || this.initializingML) return this.mlReady;
    
    this.initializingML = true;
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'INIT_ML' });
      this.mlReady = response && response.success;
      console.log('[Vision] ML initialization result:', this.mlReady);
    } catch (error) {
      console.warn('[Vision] ML initialization failed:', error);
      this.mlReady = false;
    }
    
    this.initializingML = false;
    return this.mlReady;
  }

  // Main image analysis function
  async analyzeImage(imgElement, watchlistTerms) {
    if (!imgElement || !watchlistTerms.length) {
      return { shouldBlur: false, confidence: 0, reason: "no data" };
    }

    try {
      // Always do quick checks first (these are fast and don't require ML)
      const quickCheck = this.quickImageCheck(imgElement, watchlistTerms);
      if (quickCheck.shouldBlur) {
        return {
          shouldBlur: true,
          confidence: quickCheck.confidence,
          reason: quickCheck.reason,
          type: "quick",
        };
      }

      // Try ML analysis if available
      if (!this.mlReady) {
        await this.initializeML();
      }

      if (this.mlReady) {
        try {
          const mlAnalysis = await this.performMLAnalysis(imgElement, watchlistTerms);
          if (mlAnalysis.shouldBlur) {
            return mlAnalysis;
          }
        } catch (mlError) {
          console.warn("[Vision] ML analysis failed:", mlError);
        }
      }

      return { shouldBlur: false, confidence: 0, reason: "passed all checks" };
    } catch (error) {
      console.error("[Vision] Image analysis error:", error);
      return { shouldBlur: false, confidence: 0, reason: "analysis error" };
    }
  }

  async performMLAnalysis(imgElement, watchlistTerms) {
    try {
      // Extract image data
      const imageData = await this.extractImageData(imgElement);
      if (!imageData) {
        return { shouldBlur: false, confidence: 0, reason: "no image data" };
      }

      // Send to offscreen document for ML processing
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_IMAGE',
        imageData: imageData.data,
        width: imageData.width,
        height: imageData.height,
        watchlistTerms: watchlistTerms
      });

      return response || { shouldBlur: false, confidence: 0, reason: "no response" };

    } catch (error) {
      console.error("[Vision] ML analysis error:", error);
      return { shouldBlur: false, confidence: 0, reason: "ml error" };
    }
  }

  async extractImageData(imgElement) {
    try {
      // Create canvas to extract image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (resize for performance)
      const maxSize = 416; // Good balance between accuracy and performance
      const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
      
      if (aspectRatio > 1) {
        canvas.width = maxSize;
        canvas.height = maxSize / aspectRatio;
      } else {
        canvas.width = maxSize * aspectRatio;
        canvas.height = maxSize;
      }

      // Draw image to canvas
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      return {
        data: Array.from(imageData.data), // Convert Uint8ClampedArray to regular array
        width: canvas.width,
        height: canvas.height
      };

    } catch (error) {
      console.error("[Vision] Image data extraction error:", error);
      return null;
    }
  }

  // Quick heuristic checks (no ML required)
  quickImageCheck(imgElement, watchlistTerms) {
    const src = imgElement.src || "";
    const alt = imgElement.alt || "";
    const title = imgElement.title || "";
    const allText = `${src} ${alt} ${title}`.toLowerCase();

    // Check for explicit spoiler keywords
    for (const term of watchlistTerms) {
      const termLower = term.toLowerCase();
      if (allText.includes(termLower)) {
        // Look for spoiler context clues
        const spoilerClues = [
          "spoiler", "ending", "finale", "death", "winner", "result",
          "screenshot", "scene", "episode", "season", "chapter", "leak",
          "leaked", "reveal", "revealed", "plot", "twist", "outcome"
        ];

        const hasSpoilerClue = spoilerClues.some(clue => allText.includes(clue));
        
        if (hasSpoilerClue) {
          return {
            shouldBlur: true,
            confidence: 0.9,
            reason: `Spoiler keywords detected: ${term}`,
          };
        }

        // Check for media context even without explicit spoiler words
        const mediaContext = this.checkMediaContext(allText, termLower);
        if (mediaContext.isMedia) {
          return {
            shouldBlur: true,
            confidence: 0.75,
            reason: `Media content detected: ${term} (${mediaContext.type})`,
          };
        }
      }
    }

    // Check if image looks like a screenshot
    if (this.looksLikeScreenshot(imgElement, allText)) {
      const hasWatchlistTerm = watchlistTerms.some(term => 
        allText.includes(term.toLowerCase())
      );
      
      if (hasWatchlistTerm) {
        return {
          shouldBlur: true,
          confidence: 0.65,
          reason: "Likely screenshot with watchlist terms",
        };
      }
    }

    return { shouldBlur: false, confidence: 0, reason: "passed quick check" };
  }

  checkMediaContext(text, term) {
    const mediaTypes = {
      'f1': ['formula', 'racing', 'race', 'grand prix', 'gp', 'verstappen', 'hamilton', 'ferrari', 'mercedes'],
      'game of thrones': ['got', 'dragon', 'westeros', 'hbo', 'targaryen', 'stark', 'lannister'],
      'house of dragon': ['hotd', 'daemon', 'rhaenyra', 'targaryen', 'westeros'],
      'marvel': ['mcu', 'avengers', 'spider', 'iron man', 'thor', 'hulk', 'captain america'],
      'star wars': ['jedi', 'sith', 'force', 'skywalker', 'vader', 'luke', 'leia'],
      'netflix': ['series', 'show', 'season', 'episode', 'stranger things', 'wednesday'],
      'breaking bad': ['heisenberg', 'walter white', 'jesse', 'saul'],
      'the office': ['dunder mifflin', 'scranton', 'michael scott', 'jim', 'pam']
    };

    for (const [media, keywords] of Object.entries(mediaTypes)) {
      if (term.includes(media) || keywords.some(kw => term.includes(kw))) {
        const hasContext = keywords.some(kw => text.includes(kw));
        if (hasContext) {
          return { isMedia: true, type: media };
        }
      }
    }

    return { isMedia: false, type: null };
  }

  looksLikeScreenshot(imgElement, text) {
    // Check aspect ratio - screenshots are often widescreen
    const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
    const isWidescreen = aspectRatio > 1.4;
    const isLargeEnough = imgElement.naturalWidth > 300;
    
    // Check for screenshot indicators in text
    const screenshotClues = ['screenshot', 'screen', 'cap', 'grab', 'snap'];
    const hasScreenshotClue = screenshotClues.some(clue => text.includes(clue));
    
    // UI elements that suggest this might be a screenshot
    const uiElements = ['button', 'menu', 'interface', 'ui', 'app', 'browser'];
    const hasUIElements = uiElements.some(ui => text.includes(ui));
    
    return isWidescreen && isLargeEnough && (hasScreenshotClue || hasUIElements);
  }
}

class VisualSpoilerShield {
  constructor() {
    this.imageDetector = new ImageSpoilerDetector();
    this.watchlist = [];
    this.processedImages = new Set();
    this.isInitialized = false;
    this.scanCount = 0;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['watchlist'], resolve);
      });
      
      this.watchlist = result.watchlist || [];
      
      if (!this.watchlist.length) {
        console.log('[Visual Shield] No watchlist terms found');
        return;
      }

      console.log('[Visual Shield] Initialized with watchlist:', this.watchlist);

      // Initialize ML in background
      this.imageDetector.initializeML().then(ready => {
        console.log('[Visual Shield] ML ready:', ready);
      });

      // Scan existing images
      this.scanImagesOnPage();

      // Set up observers for new images
      this.setupImageObserver();
      this.setupLazyLoadObserver();

      // Periodic rescans for dynamic content
      setInterval(() => this.scanImagesOnPage(), 6000);
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('[Visual Shield] Initialization error:', error);
    }
  }

  async scanImagesOnPage() {
    if (!this.watchlist.length) return;
    
    const images = document.querySelectorAll("img[src]:not([data-spoiler-checked])");
    if (images.length === 0) return;
    
    this.scanCount++;
    console.log(`[Visual Shield] Scan #${this.scanCount}: ${images.length} new images`);

    // Process images in smaller batches to avoid blocking
    const batchSize = 3;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = Array.from(images).slice(i, i + batchSize);
      
      // Process batch
      await Promise.all(batch.map(img => this.processImage(img)));
      
      // Small delay between batches to keep UI responsive
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
  }

  async processImage(img) {
    img.dataset.spoilerChecked = "1";

    try {
      // Wait for image to load if not already loaded
      if (!img.complete) {
        await this.waitForImageLoad(img);
      }

      // Skip tiny images (likely icons/UI elements)
      if (img.naturalWidth < 120 || img.naturalHeight < 120) return;

      // Skip if already processed
      if (this.processedImages.has(img.src)) return;
      this.processedImages.add(img.src);

      await this.analyzeAndBlurImage(img);
      
    } catch (error) {
      console.warn("[Visual Shield] Error processing image:", error);
    }
  }

  waitForImageLoad(img, timeout = 4000) {
    return new Promise((resolve) => {
      if (img.complete) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onLoad);
        resolve(); // Resolve anyway after timeout
      }, timeout);

      const onLoad = () => {
        clearTimeout(timer);
        resolve();
      };

      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onLoad, { once: true });
    });
  }

  async analyzeAndBlurImage(imgElement) {
    try {
      const analysis = await this.imageDetector.analyzeImage(imgElement, this.watchlist);

      if (analysis.shouldBlur) {
        console.log("[Visual Shield] Blurring image:", {
          src: imgElement.src.substring(0, 60) + "...",
          confidence: Math.round(analysis.confidence * 100) + "%",
          reason: analysis.reason,
          type: analysis.type,
        });

        this.blurImage(imgElement, analysis);
      }
    } catch (error) {
      console.error("[Visual Shield] Error analyzing image:", error);
    }
  }

  blurImage(imgElement, analysis) {
    // Prevent double-processing
    if (imgElement.dataset.spoilerBlurred === "1") return;
    imgElement.dataset.spoilerBlurred = "1";

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      line-height: 0;
      max-width: 100%;
    `;

    // Insert wrapper and move image into it
    imgElement.parentNode.insertBefore(wrapper, imgElement);
    wrapper.appendChild(imgElement);

    // Apply blur with intensity based on confidence
    const blurIntensity = analysis.confidence > 0.8 ? "15px" : 
                         analysis.confidence > 0.6 ? "10px" : "8px";
    
    imgElement.style.filter = `blur(${blurIntensity})`;
    imgElement.style.transition = "filter 0.3s ease";
    imgElement.style.cursor = "pointer";

    // Create reveal overlay
    const overlay = this.createRevealOverlay(analysis);
    wrapper.appendChild(overlay);

    // Set up reveal functionality
    this.setupRevealHandlers(wrapper, imgElement, overlay, analysis);
  }

  createRevealOverlay(analysis) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      cursor: pointer;
      z-index: 1000;
      border-radius: 8px;
    `;

    const confidencePercent = Math.round(analysis.confidence * 100);
    const detectionType = analysis.type === 'ml_analysis' ? '🤖' : '🔍';
    
    const revealButton = document.createElement("div");
    revealButton.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        padding: 14px 24px;
        border-radius: 30px;
        font-weight: 600;
        font-size: 15px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        gap: 10px;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255,255,255,0.2);
        transform: scale(0.95);
        transition: transform 0.2s ease;
      ">
        🛡️ Spoiler Detected
        <div style="
          font-size: 12px; 
          opacity: 0.9;
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 12px;
        ">
          ${detectionType} ${confidencePercent}%
        </div>
      </div>
    `;

    overlay.appendChild(revealButton);
    return overlay;
  }

  setupRevealHandlers(wrapper, imgElement, overlay, analysis) {
    // Show overlay on hover with animation
    wrapper.addEventListener("mouseenter", () => {
      overlay.style.opacity = "1";
      overlay.querySelector('div').style.transform = 'scale(1)';
    });

    wrapper.addEventListener("mouseleave", () => {
      overlay.style.opacity = "0";
      overlay.querySelector('div').style.transform = 'scale(0.95)';
    });

    // Reveal functionality
    const revealImage = (event) => {
      event.stopPropagation();
      event.preventDefault();
      
      imgElement.style.filter = "none";
      overlay.style.opacity = "0";
      
      // Remove overlay after transition
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 300);
      
      // Show brief success indicator
      this.showRevealedIndicator(wrapper, analysis);
      
      // Log reveal for debugging
      console.log("[Visual Shield] Image revealed:", {
        reason: analysis.reason,
        confidence: analysis.confidence,
        type: analysis.type
      });
    };

    overlay.addEventListener("click", revealImage);
    imgElement.addEventListener("click", revealImage);

    // Keyboard accessibility
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('aria-label', `Spoiler detected with ${Math.round(analysis.confidence * 100)}% confidence. Press Enter or click to reveal.`);
    
    wrapper.addEventListener("keydown", (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        revealImage(event);
      }
    });
  }

  showRevealedIndicator(wrapper, analysis) {
    const indicator = document.createElement("div");
    indicator.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(34, 197, 94, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      ">
        ✓ Revealed
        <span style="font-size: 11px; opacity: 0.8;">${analysis.type}</span>
      </div>
    `;
    
    indicator.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1001;
      opacity: 1;
      transition: opacity 2s ease;
      pointer-events: none;
    `;

    wrapper.appendChild(indicator);

    // Fade out and remove
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
      }, 2000);
    }, 2500);
  }

  setupImageObserver() {
    const observer = new MutationObserver((mutations) => {
      const imagesToProcess = [];

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is an image
            if (node.tagName === "IMG" && node.src) {
              imagesToProcess.push(node);
            }

            // Check for images within the added node
            if (node.querySelectorAll) {
              const images = node.querySelectorAll("img[src]");
              imagesToProcess.push(...Array.from(images));
            }
          }
        });
      });

      // Process new images after a small delay
      if (imagesToProcess.length > 0) {
        setTimeout(() => {
          imagesToProcess.forEach(img => this.processImage(img));
        }, 250);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[Visual Shield] Image observer set up");
  }

  setupLazyLoadObserver() {
    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && 
            entry.target.tagName === "IMG" && 
            !entry.target.dataset.spoilerChecked) {
          // Small delay to ensure image has loaded
          setTimeout(() => this.processImage(entry.target), 400);
        }
      });
    }, {
      rootMargin: "100px", // Start processing images 100px before they come into view
      threshold: 0.1
    });

    // Observe existing images
    document.querySelectorAll("img").forEach((img) => {
      lazyObserver.observe(img);
    });

    // Observe new images as they're added
    const newImageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const images = node.tagName === "IMG" ? [node] : 
                          node.querySelectorAll ? Array.from(node.querySelectorAll("img")) : [];
            images.forEach((img) => lazyObserver.observe(img));
          }
        });
      });
    });

    newImageObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[Visual Shield] Lazy load observer set up");
  }
}

// Initialize the visual spoiler shield
(async () => {
  console.log('[Visual Shield] Starting initialization...');
  
  const visualShield = new VisualSpoilerShield();
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      visualShield.initialize();
    });
  } else {
    visualShield.initialize();
  }

  // Also initialize after a short delay to catch any dynamically loaded content
  setTimeout(() => {
    visualShield.initialize();
  }, 2000);
})();