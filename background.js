console.log('[Background] Service worker loaded');

let offscreenPort = null;

async function createOffscreenDocument() {
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Run TensorFlow models for spoiler detection'
    });
    console.log('[Background] Offscreen document created');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('[Background] Offscreen document already exists');
    } else {
      console.error('[Background] Failed to create offscreen document:', e);
    }
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "offscreen-port") {
    console.log("[Background] Connected to offscreen via port");
    offscreenPort = port;

    offscreenPort.onMessage.addListener((msg) => {
      console.log("[Background] Received from offscreen:", msg);
      // You can forward these to content scripts or popup if needed
    });

    offscreenPort.onDisconnect.addListener(() => {
      console.warn("[Background] Offscreen port disconnected");
      offscreenPort = null;
    });
  }
});

// Relay messages from content scripts or popup to offscreen document via port
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_IMAGE' || message.type === 'INIT_ML') {
    const forwardMessage = () => {
      if (!offscreenPort) {
        console.warn("[Background] No connection to offscreen");
        sendResponse({ error: "Offscreen not ready" });
        return;
      }

      const handler = (response) => {
        sendResponse(response);
        offscreenPort.onMessage.removeListener(handler);
      };

      offscreenPort.onMessage.addListener(handler);
      offscreenPort.postMessage(message);
    };

    if (!offscreenPort) {
      createOffscreenDocument().then(() => {
        setTimeout(forwardMessage, 500);
      });
    } else {
      forwardMessage();
    }

    return true; // Keep channel open
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension startup');
  createOffscreenDocument();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
  createOffscreenDocument();
});