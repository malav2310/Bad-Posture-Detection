// content.js - Content Script for Blur Effect & Posture Indicator

// Settings
let blurEnabled = true; // Default: blur is enabled

// Create overlay element for blur effect
let blurOverlay = null;
let postureIndicator = null;

function createBlurOverlay() {
  if (blurOverlay) return;
  
  blurOverlay = document.createElement('div');
  blurOverlay.id = 'posture-blur-overlay';
  blurOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 999999;
    backdrop-filter: blur(0px);
    background-color: rgba(0, 0, 0, 0);
    transition: backdrop-filter 0.3s ease, background-color 0.3s ease;
  `;
  document.body.appendChild(blurOverlay);
}

function createPostureIndicator() {
  if (postureIndicator) return;
  
  postureIndicator = document.createElement('div');
  postureIndicator.id = 'posture-indicator';
  postureIndicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #22c55e;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000000;
    transition: background-color 0.3s ease, transform 0.2s ease;
    pointer-events: none;
    border: 3px solid white;
  `;
  document.body.appendChild(postureIndicator);
}

function calculateBlur(angle) {
  const GOOD_POSTURE_THRESHOLD = 80;
  const MIN_ANGLE = 40; // Maximum blur at 40° or below
  
  let blurAmount = 0;
  let opacity = 0;
  
  if (angle >= GOOD_POSTURE_THRESHOLD) {
    // 80° or above: No blur (good posture)
    blurAmount = 0;
    opacity = 0;
  } else if (angle <= MIN_ANGLE) {
    // 40° or below: Maximum blur (very bad posture)
    blurAmount = 80;
    opacity = 0.7;
  } else {
    // 79° down to 41°: Increment blur for each degree below 80
    const degreesBelowThreshold = GOOD_POSTURE_THRESHOLD - angle; // 1 to 39 degrees
    const blurPerDegree = 2; // 2px blur per degree
    const opacityPerDegree = 0.018; // Gradual opacity increase
    
    blurAmount = degreesBelowThreshold * blurPerDegree; // 2px at 79° to 78px at 41°
    opacity = degreesBelowThreshold * opacityPerDegree; // 0.018 at 79° to 0.7 at 41°
  }
  
  return { blurAmount, opacity };
}

function updateIndicator(angle) {
  if (!postureIndicator) {
    createPostureIndicator();
  }
  
  const GOOD_POSTURE_THRESHOLD = 80;
  
  if (angle >= GOOD_POSTURE_THRESHOLD) {
    // Good posture - Green
    postureIndicator.style.backgroundColor = '#22c55e';
    postureIndicator.style.transform = 'scale(1)';
  } else {
    // Bad posture - Red
    postureIndicator.style.backgroundColor = '#ef4444';
    postureIndicator.style.transform = 'scale(1.1)';
  }
}

function applyBlur(angle) {
  // Always update indicator (always shown)
  updateIndicator(angle);
  
  // Only apply blur if enabled
  if (blurEnabled) {
    if (!blurOverlay) {
      createBlurOverlay();
    }
    
    const { blurAmount, opacity } = calculateBlur(angle);
    
    blurOverlay.style.backdropFilter = `blur(${blurAmount}px)`;
    blurOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
    
    console.log(`Angle: ${angle}° | Blur: ${blurAmount.toFixed(1)}px | Opacity: ${opacity.toFixed(2)}`);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POSE_ANGLE_UPDATE') {
    const angle = message.angle;
    applyBlur(angle);
    sendResponse({ success: true });
  } else if (message.type === 'TOGGLE_BLUR') {
    blurEnabled = message.enabled;
    
    // If blur is disabled, remove blur overlay
    if (!blurEnabled && blurOverlay) {
      blurOverlay.style.backdropFilter = 'blur(0px)';
      blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    }
    
    sendResponse({ success: true, blurEnabled });
  } else if (message.type === 'GET_BLUR_STATUS') {
    sendResponse({ blurEnabled });
  }
  
  return true; // Keep message channel open for async response
});

// Initialize
if (blurEnabled) {
  createBlurOverlay();
}
createPostureIndicator();

console.log('Posture Monitor Content Script Loaded');
console.log('Blur enabled:', blurEnabled);