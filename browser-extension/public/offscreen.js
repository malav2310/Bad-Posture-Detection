let stream = null;
let isStreaming = false;
const video = document.getElementById('cameraStream');
const status = document.getElementById('status');

async function startCamera() {
  if (isStreaming) {
    console.log('Camera already running');
    return;
  }

  try {
    status.textContent = 'Requesting camera access...';
    
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    
    video.srcObject = stream;
    isStreaming = true;
    
    status.textContent = '✅ Camera Active';
    console.log('📷 Camera started successfully');

    // ✅ Save to local storage
    await chrome.storage.local.set({ cameraActive: true });
    console.log('✅ Camera started and saved to storage');
    
  } catch (error) {
    status.textContent = '❌ Camera access denied';
    console.error('❌ Camera error:', error);
    throw error;
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    isStreaming = false;
    video.srcObject = null;
    status.textContent = 'Camera stopped';
    console.log('🛑 Camera stopped');

    chrome.storage.local.set({ cameraActive: false }).then(() => {
      console.log('🧹 Camera stopped and removed from storage');
    });
  }
}

// ✅ Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startCamera') {
    startCamera()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // keeps message channel open for async
  }
  
  if (message.type === 'stopCamera') {
    stopCamera();
    sendResponse({ success: true });
  }
});

// ✅ Cleanup when the offscreen document unloads
window.addEventListener('beforeunload', () => {
  stopCamera();
});
