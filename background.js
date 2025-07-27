console.log('[Background] Service worker loaded');

let offscreenPort = null;

// Ensure offscreen doc only gets created once
async function ensureOffscreenDocument() {
  try {
    const exists = await chrome.offscreen.hasDocument();
    if (exists) {
      console.log('[Background] Offscreen document already exists');
      return;
    }

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.WORKERS], // explicit constant
      justification: 'Run ML models for spoiler detection'
    });

    console.log('[Background] Offscreen document created');
  } catch (e) {
    console.error('[Background] Failed to create offscreen document:', e);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "offscreen-port") {
    console.log("[Background] Connected to offscreen via port");
    offscreenPort = port;

    offscreenPort.onMessage.addListener((msg) => {
      console.log("[Background] Received from offscreen:", msg);
    });

    offscreenPort.onDisconnect.addListener(() => {
      console.warn("[Background] Offscreen port disconnected");
      offscreenPort = null;
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INIT_ML' || message.type === 'ANALYZE_IMAGE') {
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

    ensureOffscreenDocument().then(() => {
      setTimeout(forwardMessage, 300); // give offscreen a bit of time to connect
    });

    return true; // async sendResponse
  }
});

// One-time setup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Extension startup');
  ensureOffscreenDocument();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
  ensureOffscreenDocument();
});