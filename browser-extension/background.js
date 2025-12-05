// background.js - Main controller & router

let monitoringWindowId = null;
let isMonitoring = false;

// Receive messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background received:", msg.type);

  // -------------------------------
  // START MONITORING
  // -------------------------------
  if (msg.type === "START_MONITORING") {
    if (isMonitoring) {
      sendResponse({ success: true });
      return true;
    }

    chrome.windows.create({ 
      url: "monitoring.html",
      type: "popup",
      width: 900,
      height: 700,
      focused: true
    }, (window) => {
      monitoringWindowId = window.id;
      isMonitoring = true;

      chrome.storage.local.set({
        "monitoring-state": JSON.stringify({ isMonitoring: true }),
        "monitoring-window": window.id
      });

      sendResponse({ success: true });
    });

    return true;
  }

  // -------------------------------
  // STOP MONITORING
  // -------------------------------
  if (msg.type === "STOP_MONITORING") {
    isMonitoring = false;

    if (monitoringWindowId !== null) {
      chrome.windows.remove(monitoringWindowId).catch(() => {});
    }

    chrome.storage.local.remove(["monitoring-state", "monitoring-window"]);
    monitoringWindowId = null;

    sendResponse({ success: true });
    return true;
  }

  // ------------------------------------
  // FROM monitoring.js → angle updates
  // ------------------------------------
  if (msg.type === "POSE_ANGLE_UPDATE") {
    const angle = msg.angle;
    console.log("Received POSE_ANGLE_UPDATE:", angle);
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
          chrome.tabs.sendMessage(tab.id, {
            type: "POSE_ANGLE_UPDATE",
            angle: angle
          }).catch(() => {});
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }

  // ============================================
  // NEW: 5-MINUTE PERIODIC FEEDBACK
  // ============================================
// ------------------------------------
if (msg.type === "PERIODIC_FEEDBACK") {
  console.log("Received PERIODIC_FEEDBACK:", msg.stats);

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (
        tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("chrome-extension://")
      ) {
        chrome.tabs.sendMessage(tab.id, {
          type: "PLAY_AUDIO_FEEDBACK",
          stats: msg.stats
        }).catch(() => {});
      }
    });
  });

  sendResponse({ success: true });
  return true;
}

  // ============================================

  // KEEP ALIVE
  if (msg.type === "KEEP_ALIVE") {
    console.log("Received KEEP_ALIVE from monitoring.js");
    sendResponse({ success: true });
    return true;
  }
  
  // If no handler matched, log it
  console.warn("⚠️ No handler found for message type:", msg.type);
  return true;
});

// Handle window close - update monitoring state
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === monitoringWindowId) {
    console.log("Monitoring window closed");
    isMonitoring = false;
    monitoringWindowId = null;
    chrome.storage.local.set({
      "monitoring-state": JSON.stringify({ isMonitoring: false })
    });
    chrome.storage.local.remove(["monitoring-window"]);
  }
});