class MLProcessor {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;
    this.isInitialized = true;
    return true;
  }

  /**
   * Fake "analysis" of image data based on metadata and watchlist keywords.
   * For real ML, replace with a call to a cloud API or WASM model.
   */
  async analyzeImageData(imageData, width, height, watchlistTerms) {
    if (!this.isInitialized) await this.initialize();

    // For demo: just check if any watchlist term is found in image metadata or simulated detection
    // In reality, imageData is big — ignoring for performance

    // Example heuristic: if width or height is large, and watchlist contains suspicious terms, blur
    const suspiciousKeywords = ["f1", "formula", "racing", "spoiler", "marvel", "netflix", "game of thrones", "got"];

    const watchlistLower = watchlistTerms.map(t => t.toLowerCase());
    const foundTerm = watchlistLower.find(term => suspiciousKeywords.some(k => term.includes(k)));

    // Heuristic condition:
    const isLargeImage = width > 300 && height > 200;
    const shouldBlur = Boolean(foundTerm && isLargeImage);

    return {
      shouldBlur,
      confidence: shouldBlur ? 0.7 : 0,
      reason: shouldBlur
        ? `Heuristic match on watchlist term "${foundTerm}"`
        : "No suspicious terms found or image too small",
      type: "heuristic_analysis",
    };
  }
}

const mlProcessor = new MLProcessor();

const port = chrome.runtime.connect({ name: "offscreen-port" });

port.onMessage.addListener(async (message) => {
  if (message.type === "ANALYZE_IMAGE") {
    try {
      const result = await mlProcessor.analyzeImageData(
        message.imageData,
        message.width,
        message.height,
        message.watchlistTerms
      );
      port.postMessage(result);
    } catch (error) {
      port.postMessage({
        shouldBlur: false,
        confidence: 0,
        reason: "processing error",
      });
    }
  }

  if (message.type === "INIT_ML") {
    try {
      const success = await mlProcessor.initialize();
      port.postMessage({ success });
    } catch (error) {
      port.postMessage({ success: false, error: error.message });
    }
  }
});

// Initialize once when offscreen loads
mlProcessor.initialize().then(success => {
  console.warn("[Offscreen] Initial ML setup:", success ? "success" : "failed");
});