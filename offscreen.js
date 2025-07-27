// Offscreen document for ML processing

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-wasm';



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

      // TensorFlow is loaded globally from script tags
      this.tf = window.tf;
      this.cocoSsd = window.cocoSsd;

      if (!this.tf || !this.cocoSsd) {
        throw new Error("TensorFlow libraries not loaded");
      }

      // Optional but recommended: Set the WASM path explicitly
      this.tf.setWasmPaths(chrome.runtime.getURL("lib/"));

      // Force WASM only — prevents TF from trying to use WebGL or CPU (which may eval)
      this.tf.ENV.set("WEBGL_VERSION", 0);
      this.tf.ENV.set("HAS_WEBGL", false);
      this.tf.ENV.set("HAS_WEBGPU", false);

      // Set up WASM backend
      await this.tf.setBackend("wasm");
      await this.tf.ready();
      console.log("[Offscreen] TensorFlow WASM backend ready");

      // Load COCO-SSD model
      this.cocoSsdModel = await this.cocoSsd.load();
      console.log("[Offscreen] COCO-SSD model loaded");

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("[Offscreen] Initialization failed:", error);

      // Try CPU fallback
      try {
        await this.tf.setBackend("wasm");
        await this.tf.ready();
        this.cocoSsdModel = await this.cocoSsd.load();
        console.log("[Offscreen] CPU fallback successful");
        this.isInitialized = true;
        return true;
      } catch (fallbackError) {
        console.error("[Offscreen] CPU fallback failed:", fallbackError);
        return false;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  async analyzeImageData(imageData, width, height, watchlistTerms) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) {
        return { shouldBlur: false, confidence: 0, reason: "ML not available" };
      }
    }

    try {
      // Create canvas from image data
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      const imgData = new ImageData(
        new Uint8ClampedArray(imageData),
        width,
        height
      );
      ctx.putImageData(imgData, 0, 0);

      // Convert to tensor for TensorFlow
      const tensor = this.tf.browser.fromPixels(canvas);

      // Run object detection
      const predictions = await this.cocoSsdModel.detect(canvas);

      // Clean up tensor
      tensor.dispose();

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

    for (const detection of detections) {
      if (detection.score < 0.3) continue;

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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_IMAGE") {
    mlProcessor
      .analyzeImageData(
        message.imageData,
        message.width,
        message.height,
        message.watchlistTerms
      )
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        console.error("[Offscreen] Message handling error:", error);
        sendResponse({
          shouldBlur: false,
          confidence: 0,
          reason: "processing error",
        });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === "INIT_ML") {
    mlProcessor
      .initialize()
      .then((success) => {
        sendResponse({ success });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

