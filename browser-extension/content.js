// content.js - Content Script for Blur Effect

// Create overlay element for blur effect
let blurOverlay = null;

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

function applyBlur(angle) {
  if (!blurOverlay) {
    createBlurOverlay();
  }
  
  const { blurAmount, opacity } = calculateBlur(angle);
  
  blurOverlay.style.backdropFilter = `blur(${blurAmount}px)`;
  blurOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  
  console.log(`Angle: ${angle}° | Blur: ${blurAmount.toFixed(1)}px | Opacity: ${opacity.toFixed(2)}`);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POSE_ANGLE_UPDATE') {
    const angle = message.angle;
    applyBlur(angle);
    sendResponse({ success: true });
  }
});

// Initialize overlay on load
createBlurOverlay();

console.log('Posture Monitor Content Script Loaded');