// Background service worker for Posture Detective
console.log('Background service worker starting...');

// Load state on startup
chrome.storage.local.get(['offscreenCreated', 'cameraActive'], (result) => {
  console.log('Loaded state from storage:', result);
});

self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  event.waitUntil(self.clients.claim());
});

// 🔹 Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'createOffscreen':
      handleCreateOffscreen()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'startCamera':
      handleStartCamera()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'stopCamera':
      handleStopCamera()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      console.warn('Unknown message type:', message.type);
  }
});

// ✅ Create or confirm offscreen document
async function handleCreateOffscreen() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      console.log('Offscreen document already exists');
      await chrome.storage.local.set({ offscreenCreated: true });
      console.log('✅ Saved offscreenCreated: true to storage');
      return;
    }

    console.log('Creating new offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Camera stream for posture detection'
    });

    await chrome.storage.local.set({ offscreenCreated: true });
    console.log('✅ Offscreen document created and saved to storage');
  } catch (error) {
    console.error('Error in handleCreateOffscreen:', error);
    throw error;
  }
}

// ✅ Start camera logic
async function handleStartCamera() {
  try {
    await handleCreateOffscreen();
    await new Promise(resolve => setTimeout(resolve, 100)); // small delay to ensure setup

    console.log('Sending startCamera message to offscreen document');
    await chrome.runtime.sendMessage({ type: 'startCamera' });

    //await chrome.storage.local.set({ cameraActive: true });
    //console.log('✅ Camera started and saved to storage');
  } catch (error) {
    console.error('Error in handleStartCamera:', error);
    throw error;
  }
}

// ✅ Stop camera logic
async function handleStopCamera() {
  try {
    console.log('Sending stopCamera message to offscreen document');
    await chrome.runtime.sendMessage({ type: 'stopCamera' });

    //await chrome.storage.local.set({ cameraActive: false });
    //console.log('✅ Camera stopped and saved to storage');
  } catch (error) {
    console.error('Error in handleStopCamera:', error);
  }
}

// 🔹 Watch storage for debugging
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    console.log('📦 chrome.storage.local changed:', changes);
  }
});

console.log('Background service worker setup complete');
