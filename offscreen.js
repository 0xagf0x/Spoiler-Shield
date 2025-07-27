// Offscreen document for ML processing
console.log("[Offscreen] ML processor loaded");

class MLProcessor {
  constructor() {
    this.tf = null;
    this.cocoSsd = null;
    this.cocoSsdModel = null;
    this.isInitialized = false;
    this.isInitializing = false;
  }

  async initialize() {
    if (this.isInitialized || this.isInitializing) {
      return this.isInitialized;
    }

    this.isInitializing = true;

    try {
      console.log("[Offscreen] Initializing TensorFlow...");

      // Wait for libraries to be available
      await this.waitForLibraries();

      this.tf = window.tf;
      this.cocoSsd = window.cocoSsd;

      if (!this.tf || !this.cocoSsd) {
        throw new Error("TensorFlow libraries not loaded");
      }

      console.log("[Offscreen] TensorFlow found:", !!this.tf);
      console.log("[Offscreen] COCO-SSD found:", !!this.cocoSsd);
      console.log("[Offscreen] TF version:", this.tf.version);

      // Wait for TensorFlow to be ready
      await this.tf.ready();
      console.log("[Offscreen] TensorFlow ready, backend:", this.tf.getBackend());

      // Load COCO-SSD model (let it use default backend)
      console.log("[Offscreen] Loading COCO-SSD model...");
      this.cocoSsdModel = await this.cocoSsd.load({
        base: 'lite_mobilenet_v2' // Use lighter model for better compatibility
      });
      console.log("[Offscreen] COCO-SSD model loaded successfully");

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("[Offscreen] Initialization failed:", error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  async waitForLibraries() {
    return new Promise((resolve) => {
      const checkLibraries = () => {
        if (window.tf && window.cocoSsd) {
          resolve();
        } else {
          setTimeout(checkLibraries, 100);
        }
      };
      checkLibraries();
    });
  }

  async analyzeImageData(imageData, width, height, watchlistTerms) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        return { shouldBlur: false, confidence: 0, reason: "ML not available" };
      }
    }

    try {
      // Try to create tensor from image data
      let tensor;
      let predictions;

      // Method 1: Try using ImageData directly
      try {
        const imgData = new ImageData(
          new Uint8ClampedArray(imageData),
          width,
          height
        );
        
        // Create canvas and draw image data
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        ctx.putImageData(imgData, 0, 0);
        
        // Run detection on canvas
        predictions = await this.cocoSsdModel.detect(canvas);
        
      } catch (canvasError) {
        console.warn("[Offscreen] Canvas method failed:", canvasError);
        
        // Method 2: Try creating tensor directly from pixel data
        try {
          tensor = this.tf.tensor3d(
            new Uint8Array(imageData), 
            [height, width, 4]
          );
          
          // Convert RGBA to RGB and normalize
          const rgbTensor = tensor.slice([0, 0, 0], [height, width, 3]);
          tensor.dispose();
          
          predictions = await this.cocoSsdModel.detect(rgbTensor);
          rgbTensor.dispose();
          
        } catch (tensorError) {
          console.error("[Offscreen] Both methods failed:", tensorError);
          return { shouldBlur: false, confidence: 0, reason: "image processing error" };
        }
      }

      // Analyze results
      const analysis = this.analyzeDetections(predictions, watchlistTerms);
      return analysis;

    } catch (error) {
      console.error("[Offscreen] Analysis error:", error);
      return { shouldBlur: false, confidence: 0, reason: "analysis error" };
    }
  }

  analyzeDetections(detections, watchlistTerms) {
    let confidence = 0;
    let reasons = [];

    console.log("[Offscreen] Analyzing", detections.length, "detections");

    for (const detection of detections) {
      if (detection.score < 0.3) continue;

      console.log("[Offscreen] Detection:", detection.class, "score:", detection.score);

      // Check for people (often in spoiler content)
      if (detection.class === "person" && detection.score > 0.5) {
        confidence += 0.25;
        reasons.push("Person detected");
      }

      // Check for vehicles (F1, racing content)
      if (["car", "truck", "motorcycle", "bus"].includes(detection.class)) {
        const hasVehicleTerms = watchlistTerms.some((term) =>
          ["f1", "formula", "racing", "car", "race", "grand prix", "gp"].some(
            (keyword) => term.toLowerCase().includes(keyword)
          )
        );
        if (hasVehicleTerms) {
          confidence += 0.5;
          reasons.push(`Vehicle detected with racing terms`);
        }
      }

      // Check for sports equipment
      if (
        ["sports ball", "frisbee", "baseball bat", "tennis racket"].includes(
          detection.class
        )
      ) {
        const hasSportsTerms = watchlistTerms.some((term) =>
          ["sport", "game", "match", "championship", "tournament"].some(
            (keyword) => term.toLowerCase().includes(keyword)
          )
        );
        if (hasSportsTerms) {
          confidence += 0.3;
          reasons.push("Sports equipment detected");
        }
      }

      // Check for electronics (TV screens, phones showing content)
      if (["tv", "laptop", "cell phone", "remote"].includes(detection.class)) {
        const hasMediaTerms = watchlistTerms.some((term) =>
          ["netflix", "hbo", "disney", "show", "series", "movie"].some(
            (keyword) => term.toLowerCase().includes(keyword)
          )
        );
        if (hasMediaTerms) {
          confidence += 0.3;
          reasons.push("Screen/device detected with media terms");
        }
      }
    }

    return {
      shouldBlur: confidence > 0.4,
      confidence: Math.min(confidence, 1.0),
      reason: reasons.join("; ") || "ML analysis completed",
      type: "ml_analysis",
      detections: detections.length,
      detectionsFound: detections.map((d) => ({
        class: d.class,
        score: Math.round(d.score * 100),
      })),
    };
  }
}

// Initialize processor
const mlProcessor = new MLProcessor();

// Set up port communication with background script
const port = chrome.runtime.connect({ name: "offscreen-port" });

port.onMessage.addListener(async (message) => {
  console.log("[Offscreen] Received message:", message.type);

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
      console.error("[Offscreen] Analysis error:", error);
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
      console.error("[Offscreen] Init error:", error);
      port.postMessage({ success: false, error: error.message });
    }
  }
});

// Initialize ML when offscreen document loads
mlProcessor.initialize().then(success => {
  console.log("[Offscreen] Initial ML setup:", success ? "success" : "failed");
});