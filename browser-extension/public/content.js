function createFloatingIcon() {
  // Remove existing icon to prevent duplicates
  const existingIcon = document.getElementById('posture-floating-icon');
  if (existingIcon) existingIcon.remove();

  // Create floating icon
  const icon = document.createElement('div');
  icon.id = 'posture-floating-icon';
  icon.innerHTML = `
    <button id="posture-toggle" title="Toggle Posture Detector">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M10 10l4 4m0-4l-4 4"/>
      </svg>
    </button>
  `;
  document.body.appendChild(icon);

  // Add click handler to toggle overlay
  const toggleBtn = icon.querySelector('#posture-toggle');
  toggleBtn.addEventListener('click', toggleOverlay);
}

function toggleOverlay() {
  let overlay = document.getElementById('posture-overlay');
  if (overlay) {
    overlay.remove();
    chrome.runtime.sendMessage({ action: 'closeOverlay' });
    return;
  }

  // Create overlay with iframe
  overlay = document.createElement('div');
  overlay.id = 'posture-overlay';
  overlay.innerHTML = `
    <div class="posture-overlay-container">
      <iframe src="${chrome.runtime.getURL('index.html')}" id="posture-iframe"></iframe>
      <button id="close-overlay">×</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close button
  overlay.querySelector('#close-overlay').addEventListener('click', () => {
    overlay.remove();
    chrome.runtime.sendMessage({ action: 'closeOverlay' });
  });

  // Make overlay draggable
  const container = overlay.querySelector('.posture-overlay-container');
  let isDragging = false;
  let currentX = 0, currentY = 0, initialX, initialY;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    container.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      container.style.left = `${currentX}px`;
      container.style.top = `${currentY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });
}

// Inject on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingIcon);
} else {
  createFloatingIcon();
}

// Re-inject on dynamic content (e.g., SPAs)
new MutationObserver(() => createFloatingIcon()).observe(document.body, { childList: true, subtree: true });