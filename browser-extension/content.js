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

// ============================================
// NEW: 5-MINUTE AUDIO FEEDBACK SYSTEM
// ============================================

// Audio feedback messages based on performance
const feedbackMessages = {
  excellent: [
    "Excellent posture! You're doing great, keep it up!",
    "Outstanding! Your posture has been excellent.",
    "Fantastic work! Your spine will thank you.",
    "Perfect posture maintenance! Well done!"
  ],
  good: [
    "Good job! Your posture is mostly good.",
    "Well done! Keep maintaining that good posture.",
    "Nice work! You're on the right track.",
    "Good posture! Just a few adjustments needed."
  ],
  fair: [
    "Your posture needs some attention. Try to sit up straighter.",
    "Remember to check your posture more often.",
    "Let's improve that posture. Sit back and straighten up.",
    "Time for a posture check. Adjust your position."
  ],
  poor: [
    "Your posture needs immediate attention. Please sit up straight.",
    "Alert! Your posture has been poor. Take a moment to adjust.",
    "Important: Your posture needs correction. Straighten your back now.",
    "Warning! Poor posture detected. Please correct your sitting position."
  ]
};

function getFeedbackMessage(goodPercentage) {
  let category;
  
  if (goodPercentage >= 90) {
    category = 'excellent';
  } else if (goodPercentage >= 70) {
    category = 'good';
  } else if (goodPercentage >= 50) {
    category = 'fair';
  } else {
    category = 'poor';
  }
  
  const messages = feedbackMessages[category];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

function playAudioFeedback(stats) {
  console.log('Playing audio feedback for stats:', stats);
  
  const message = getFeedbackMessage(parseFloat(stats.goodPercentage));
  
  // Use Web Speech API to speak the feedback
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message);
    
    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Optional: Select a specific voice (prefer female voices as they're often clearer)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && (voice.name.includes('Female') || voice.name.includes('Google'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Speak the message
    window.speechSynthesis.speak(utterance);
    
    console.log('Audio feedback spoken:', message);
    
    // Show visual notification as well
    showFeedbackNotification(message, stats);
  } else {
    console.warn('Speech synthesis not supported');
    // Still show visual notification
    showFeedbackNotification(message, stats);
  }
}

function showFeedbackNotification(message, stats) {
  // Remove any existing notification
  const existingNotification = document.getElementById('posture-feedback-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'posture-feedback-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    z-index: 10000000;
    max-width: 350px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: slideInRight 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="font-size: 24px;">🎯</div>
      <div style="font-weight: bold; font-size: 16px;">5-Minute Posture Check</div>
    </div>
    <div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">
      ${message}
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 12px; opacity: 0.9;">
      <span>✅ Good: ${stats.goodCount}</span>
      <span>❌ Bad: ${stats.badCount}</span>
      <span>📊 Score: ${stats.goodPercentage}%</span>
    </div>
  `;
  
  // Add animation styles if not already added
  if (!document.getElementById('posture-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'posture-feedback-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Load voices (needed for speech synthesis)
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);
  };
}

// ============================================

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Existing angle update handler
  if (message.type === 'POSE_ANGLE_UPDATE') {
    const angle = message.angle;
    applyBlur(angle);
    sendResponse({ success: true });
  } 
  
  // Existing blur toggle handler
  else if (message.type === 'TOGGLE_BLUR') {
    blurEnabled = message.enabled;
    
    // If blur is disabled, remove blur overlay
    if (!blurEnabled && blurOverlay) {
      blurOverlay.style.backdropFilter = 'blur(0px)';
      blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    }
    
    sendResponse({ success: true, blurEnabled });
  } 
  
  // Existing blur status handler
  else if (message.type === 'GET_BLUR_STATUS') {
    sendResponse({ blurEnabled });
  }
  
  // NEW: Audio feedback handler
  else if (message.type === 'PLAY_AUDIO_FEEDBACK') {
    console.log('Received PLAY_AUDIO_FEEDBACK message');
    playAudioFeedback(message.stats);
    sendResponse({ success: true });
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
console.log('Audio feedback enabled: true');