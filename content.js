// Enhanced Spoiler Shield with Image Recognition
console.log('[Spoiler Shield Vision] Loaded on', window.location.hostname);

const tfjsScript = document.createElement('script');
tfjsScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js';
document.head.appendChild(tfjsScript);

mobilenetScript.onload = () => {
  console.log('All TF scripts loaded, ready to initialize models');

  // Initialize the ImageSpoilerDetector to load the TF models
  const imageSpoilerDetector = new ImageSpoilerDetector();

  // Wait for models to finish loading before starting the shield
  (async () => {
    // Poll until models loaded or timeout after 10 seconds
    const waitForModels = () => new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (imageSpoilerDetector.mobilenetModel && imageSpoilerDetector.cocoSsdModel) {
          resolve();
        } else if (Date.now() - start > 10000) {
          reject('Timeout loading TF models');
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });

    try {
      await waitForModels();
      console.log('[Vision] Models ready, starting VisualSpoilerShield');

      // Pass the loaded image detector into the visual shield to reuse models
      const visualShield = new VisualSpoilerShield();
      // Replace the shield's imageDetector with the one with loaded models
      visualShield.imageDetector = imageSpoilerDetector;
      // Initialize the shield logic (load watchlist, scan images, etc.)
      await visualShield.initialize();
    } catch (err) {
      console.error('[Vision] Failed to load models:', err);
      // You can fallback to simpler logic or just start VisualSpoilerShield anyway
      const visualShield = new VisualSpoilerShield();
      await visualShield.initialize();
    }
  })();
};


class ImageSpoilerDetector {
  constructor() {
    this.mobilenetModel = null;
    this.cocoSsdModel = null;
    this.isLoading = false;
    this.imageCache = new Map();
    this.initializeModels();
  }

  async initializeModels() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      console.log('[Vision] Loading TensorFlow models...');
      
      // Load MobileNet for general image classification
      this.mobilenetModel = await tf.loadLayersModel('https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/classification/5/default/1', {
        fromTFHub: true
      });
      
      // Load COCO-SSD for object detection (detects people, faces, etc.)
      this.cocoSsdModel = await cocoSsd.load();
      
      console.log('[Vision] Models loaded successfully');
    } catch (error) {
      console.error('[Vision] Failed to load models, using fallback detection:', error);
      // Continue with simpler detection methods
    }
    
    this.isLoading = false;
  }

  // Main image analysis function
  async analyzeImage(imgElement, watchlistTerms) {
    try {
      // Quick checks first
      const quickCheck = this.quickImageCheck(imgElement, watchlistTerms);
      if (quickCheck.shouldBlur) {
        return { 
          shouldBlur: true, 
          confidence: quickCheck.confidence,
          reason: quickCheck.reason,
          type: 'quick'
        };
      }

      // Deep ML analysis
      if (this.mobilenetModel && this.cocoSsdModel) {
        const mlAnalysis = await this.deepImageAnalysis(imgElement, watchlistTerms);
        if (mlAnalysis.shouldBlur) {
          return mlAnalysis;
        }
      }

      return { shouldBlur: false, confidence: 0, reason: 'safe' };
    } catch (error) {
      console.error('[Vision] Image analysis error:', error);
      return { shouldBlur: false, confidence: 0, reason: 'error' };
    }
  }

  // Quick heuristic checks before expensive ML
  quickImageCheck(imgElement, watchlistTerms) {
    const src = imgElement.src || '';
    const alt = imgElement.alt || '';
    const title = imgElement.title || '';
    const allText = `${src} ${alt} ${title}`.toLowerCase();

    // Check for spoiler keywords in image metadata
    for (const term of watchlistTerms) {
      if (allText.includes(term.toLowerCase())) {
        // Check for spoiler context clues
        const spoilerClues = [
          'spoiler', 'ending', 'finale', 'death', 'winner', 'result', 
          'screenshot', 'scene', 'episode', 'season', 'chapter'
        ];
        
        const hasSpoilerClue = spoilerClues.some(clue => allText.includes(clue));
        
        if (hasSpoilerClue) {
          return {
            shouldBlur: true,
            confidence: 0.8,
            reason: `Spoiler keywords detected: ${term}`
          };
        }
      }
    }

    // Check image dimensions - screenshots tend to be landscape
    const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
    if (aspectRatio > 1.5 && imgElement.naturalWidth > 400) {
      // Likely a screenshot - check for media-related terms
      const mediaTerms = watchlistTerms.some(term => 
        ['f1', 'formula', 'dragon', 'thrones', 'marvel', 'star wars'].some(media => 
          term.toLowerCase().includes(media)
        )
      );
      
      if (mediaTerms && allText.length > 10) {
        return {
          shouldBlur: true,
          confidence: 0.6,
          reason: 'Likely screenshot of media content'
        };
      }
    }

    return { shouldBlur: false, confidence: 0, reason: 'passed quick check' };
  }

  // Deep ML analysis using TensorFlow models
  async deepImageAnalysis(imgElement, watchlistTerms) {
    try {
      // Convert image to tensor
      const tensor = this.preprocessImage(imgElement);
      if (!tensor) return { shouldBlur: false, confidence: 0, reason: 'preprocessing failed' };

      // Object detection - look for people, faces, etc.
      const detections = await this.cocoSsdModel.detect(imgElement);
      
      // Image classification
      const predictions = await this.mobilenetModel.predict(tensor).data();
      const topPredictions = this.getTopPredictions(predictions);

      tensor.dispose(); // Clean up memory

      // Analyze results
      const analysis = this.analyzeMLResults(detections, topPredictions, watchlistTerms);
      
      return analysis;
    } catch (error) {
      console.error('[Vision] Deep analysis error:', error);
      return { shouldBlur: false, confidence: 0, reason: 'analysis error' };
    }
  }

  preprocessImage(imgElement) {
    try {
      // Create canvas to process image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Resize to model input size (224x224 for MobileNet)
      canvas.width = 224;
      canvas.height = 224;
      
      ctx.drawImage(imgElement, 0, 0, 224, 224);
      
      // Convert to tensor
      const tensor = tf.browser.fromPixels(canvas)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255.0)
        .expandDims();
      
      return tensor;
    } catch (error) {
      console.error('[Vision] Image preprocessing error:', error);
      return null;
    }
  }

  getTopPredictions(predictions, topK = 5) {
    // Get top K predictions from ImageNet classifications
    const predArray = Array.from(predictions);
    const indexed = predArray.map((prob, index) => ({ prob, index }));
    indexed.sort((a, b) => b.prob - a.prob);
    
    return indexed.slice(0, topK).map(item => ({
      probability: item.prob,
      classIndex: item.index,
      className: this.getImageNetClass(item.index)
    }));
  }

  analyzeMLResults(detections, predictions, watchlistTerms) {
    let confidence = 0;
    let reasons = [];

    // Analyze object detections
    for (const detection of detections) {
      if (detection.score > 0.5) {
        if (detection.class === 'person') {
          confidence += 0.3;
          reasons.push('Person detected in image');
        }
        
        // Check for vehicles (F1 cars, etc.)
        if (['car', 'truck', 'motorcycle'].includes(detection.class)) {
          const hasF1Terms = watchlistTerms.some(term => 
            term.toLowerCase().includes('f1') || term.toLowerCase().includes('formula')
          );
          if (hasF1Terms) {
            confidence += 0.4;
            reasons.push('Vehicle detected with F1 in watchlist');
          }
        }
      }
    }

    // Analyze image classifications
    for (const pred of predictions) {
      if (pred.probability > 0.1) {
        // Check for sports-related classifications
        const sportsClasses = ['race car', 'sports car', 'helmet', 'stadium'];
        if (sportsClasses.some(cls => pred.className.toLowerCase().includes(cls))) {
          const hasSportsTerms = watchlistTerms.some(term => 
            ['f1', 'formula', 'racing', 'sport'].some(sport => 
              term.toLowerCase().includes(sport)
            )
          );
          if (hasSportsTerms) {
            confidence += pred.probability * 0.5;
            reasons.push(`Sports content detected: ${pred.className}`);
          }
        }

        // Check for TV/movie related content
        const mediaClasses = ['television', 'screen', 'movie theater'];
        if (mediaClasses.some(cls => pred.className.toLowerCase().includes(cls))) {
          const hasMediaTerms = watchlistTerms.some(term => 
            ['dragon', 'thrones', 'marvel', 'star wars', 'netflix'].some(media => 
              term.toLowerCase().includes(media)
            )
          );
          if (hasMediaTerms) {
            confidence += pred.probability * 0.4;
            reasons.push(`Media content detected: ${pred.className}`);
          }
        }
      }
    }

    return {
      shouldBlur: confidence > 0.4,
      confidence: Math.min(confidence, 1.0),
      reason: reasons.join('; ') || 'ML analysis',
      type: 'deep',
      detections: detections.length,
      topPrediction: predictions[0]?.className || 'unknown'
    };
  }

  // Simplified ImageNet class names (you'd want the full list in production)
  getImageNetClass(index) {
    const commonClasses = {
      751: 'race car',
      817: 'sports car', 
      468: 'television',
      510: 'computer screen',
      634: 'stadium',
      514: 'helmet'
    };
    return commonClasses[index] || `class_${index}`;
  }
}

class VisualSpoilerShield {
  constructor() {
    this.imageDetector = new ImageSpoilerDetector();
    this.watchlist = [];
    this.processedImages = new Set();
    this.initialize();
  }

  async initialize() {
    chrome.storage.sync.get(['watchlist'], (res) => {
      this.watchlist = res.watchlist || [];
      if (!this.watchlist.length) return;

      console.log('[Visual Shield] Initialized with watchlist:', this.watchlist);

      // Scan existing images
      this.scanImagesOnPage();

      // Set up observers for new images
      this.setupImageObserver();
      this.setupLazyLoadObserver();

      // Periodic rescans for dynamic content
      setInterval(() => this.scanImagesOnPage(), 3000);
    });
  }

  async scanImagesOnPage() {
    const images = document.querySelectorAll('img[src]:not([data-spoiler-checked])');
    console.log(`[Visual Shield] Scanning ${images.length} new images`);

    for (const img of images) {
      img.dataset.spoilerChecked = '1';
      
      // Wait for image to load
      if (!img.complete) {
        await new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2000); // Timeout after 2s
        });
      }

      // Skip tiny images (likely icons)
      if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;

      await this.analyzeAndBlurImage(img);
    }
  }

  async analyzeAndBlurImage(imgElement) {
    try {
      const analysis = await this.imageDetector.analyzeImage(imgElement, this.watchlist);
      
      if (analysis.shouldBlur) {
        console.log('[Visual Shield] Blurring image:', {
          src: imgElement.src.substring(0, 50),
          confidence: analysis.confidence,
          reason: analysis.reason,
          type: analysis.type
        });

        this.blurImage(imgElement, analysis);
      }
    } catch (error) {
      console.error('[Visual Shield] Error analyzing image:', error);
    }
  }

  blurImage(imgElement, analysis) {
    // Don't blur if already processed
    if (imgElement.dataset.spoilerBlurred === '1') return;
    
    imgElement.dataset.spoilerBlurred = '1';

    // Create wrapper for the image
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-block;
      line-height: 0;
    `;

    // Insert wrapper
    imgElement.parentNode.insertBefore(wrapper, imgElement);
    wrapper.appendChild(imgElement);

    // Apply blur effect
    const blurIntensity = analysis.confidence > 0.7 ? '10px' : '6px';
    imgElement.style.filter = `blur(${blurIntensity})`;
    imgElement.style.transition = 'filter 0.3s ease';
    imgElement.style.cursor = 'pointer';

    // Create reveal overlay
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
      opacity: 0;
      transition: opacity 0.3s ease;
      cursor: pointer;
      z-index: 1000;
    `;

    // Create reveal button
    const revealButton = document.createElement('div');
    revealButton.innerHTML = `
      <div style="
        background: white;
        color: black;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        👁️ Reveal Image
        <div style="font-size: 11px; opacity: 0.7;">
          ${Math.round(analysis.confidence * 100)}% confident
        </div>
      </div>
    `;

    overlay.appendChild(revealButton);
    wrapper.appendChild(overlay);

    // Show overlay on hover
    wrapper.addEventListener('mouseenter', () => {
      overlay.style.opacity = '1';
    });

    wrapper.addEventListener('mouseleave', () => {
      overlay.style.opacity = '0';
    });

    // Reveal functionality
    const revealImage = () => {
      imgElement.style.filter = 'none';
      overlay.remove();
      
      // Optional: show a brief "revealed" indicator
      this.showRevealedIndicator(wrapper);
    };

    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      revealImage();
    });

    imgElement.addEventListener('click', (e) => {
      e.stopPropagation();
      revealImage();
    });
  }

  showRevealedIndicator(wrapper) {
    const indicator = document.createElement('div');
    indicator.textContent = '✓ Revealed';
    indicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 255, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1001;
      opacity: 1;
      transition: opacity 2s ease;
    `;

    wrapper.appendChild(indicator);

    // Fade out after 2 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 2000);
    }, 2000);
  }

  setupImageObserver() {
    // Observer for dynamically added images
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is an image
            if (node.tagName === 'IMG') {
              setTimeout(() => this.analyzeAndBlurImage(node), 100);
            }
            
            // Check for images within the added node
            const images = node.querySelectorAll ? node.querySelectorAll('img[src]') : [];
            images.forEach(img => {
              setTimeout(() => this.analyzeAndBlurImage(img), 100);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupLazyLoadObserver() {
    // Observer for lazy-loaded images
    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.tagName === 'IMG') {
          setTimeout(() => this.analyzeAndBlurImage(entry.target), 500);
        }
      });
    });

    // Observe all images
    document.querySelectorAll('img').forEach(img => {
      lazyObserver.observe(img);
    });

    // Observe new images as they're added
    const newImageObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const images = node.tagName === 'IMG' ? [node] : 
                          (node.querySelectorAll ? Array.from(node.querySelectorAll('img')) : []);
            images.forEach(img => lazyObserver.observe(img));
          }
        });
      });
    });

    newImageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the visual spoiler shield
const visualShield = new VisualSpoilerShield();