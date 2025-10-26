import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

let stream = null;
let isStreaming = false;
let isMonitoring = false;
let detector = null;
let animationId = null;

console.log('✅ Offscreen script loaded');

const video = document.getElementById('cameraStream');
const canvas = document.getElementById('poseCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

// Load TensorFlow.js MoveNet
async function loadMoveNet() {
  try {
    status.textContent = 'Loading MoveNet model...';
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('✅ TensorFlow.js backend:', tf.getBackend());

    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );

    console.log('✅ MoveNet loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to load MoveNet:', error);
    status.textContent = '❌ Failed to load pose model';
    return false;
  }
}

async function startCamera() {
  if (isStreaming) {
    console.log('Camera already running');
    return;
  }

  try {
    status.textContent = 'Requesting camera access...';

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    isStreaming = true;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    status.textContent = '✅ Camera Active';
    console.log('📷 Camera started successfully');

    await chrome.storage.local.set({ cameraActive: true });
    console.log('✅ Camera state saved');
  } catch (error) {
    status.textContent = '❌ Camera access denied';
    console.error('Camera error:', error);
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

    chrome.storage.local.set({ cameraActive: false });
  }
}

async function startMonitoring() {
  if (!isStreaming) return { success: false, error: 'Camera not started' };
  if (isMonitoring) return { success: true };

  if (!detector) {
    const loaded = await loadMoveNet();
    if (!loaded) return { success: false, error: 'Model failed to load' };
  }

  isMonitoring = true;
  status.textContent = '🔍 Monitoring poses...';
  detectPose();
  return { success: true };
}

function stopMonitoring() {
  if (!isMonitoring) return { success: true };
  isMonitoring = false;
  cancelAnimationFrame(animationId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  status.textContent = '✅ Camera Active';
  console.log('🛑 Pose monitoring stopped');
  return { success: true };
}

async function detectPose() {
  if (!isMonitoring) return;

  try {
    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (poses.length > 0) {
      drawPose(poses[0]);
    }
  } catch (err) {
    console.error('Pose detection error:', err);
  }

  animationId = requestAnimationFrame(detectPose);
}

function drawPose(pose) {
  const keypoints = pose.keypoints;
  const minConfidence = 0.3;

  keypoints.forEach(kp => {
    if (kp.score > minConfidence) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FF00';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
  });
}

// Message handling
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'startCamera') {
    startCamera().then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (msg.type === 'stopCamera') {
    stopCamera();
    sendResponse({ success: true });
  }

  if (msg.type === 'startMonitoring') {
    startMonitoring().then(r => sendResponse(r));
    return true;
  }

  if (msg.type === 'stopMonitoring') {
    sendResponse(stopMonitoring());
  }
});

window.addEventListener('beforeunload', () => {
  stopMonitoring();
  stopCamera();
});
console.log('last line of offscreen.js');