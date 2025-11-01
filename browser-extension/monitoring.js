// monitoring.js - Camera preview with MoveNet (WebGL enabled)

import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

let stream = null;
let isRunning = false;
let detector = null;
let detectionInterval = null;

// Initialize TensorFlow backend (use WebGL for performance)
async function initTF() {
  try {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('TensorFlow.js backend:', tf.getBackend());
    status.textContent = '✓ WebGL backend initialized';
  } catch (err) {
    console.error('Error initializing TensorFlow WebGL backend:', err);
    status.textContent = '✗ WebGL initialization failed';
    status.className = 'status error';
  }
}

// Initialize MoveNet
async function initMoveNet() {
  status.textContent = 'Loading MoveNet model...';
  try {
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });
    status.textContent = '✓ MoveNet model loaded';
  } catch (error) {
    console.error('Error loading MoveNet model:', error);
    status.textContent = '✗ Failed to load MoveNet model';
    status.className = 'status error';
  }
}

// Initialize camera stream
async function initCamera() {
  try {
    status.textContent = 'Requesting camera access...';
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });

    video.srcObject = stream;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      status.textContent = '✓ Camera active - Monitoring posture';
      status.className = 'status active';
      isRunning = true;
      startDetection();
    };
  } catch (error) {
    console.error('Error accessing camera:', error);
    status.textContent = '✗ Camera access denied or unavailable';
    status.className = 'status error';
  }
}

// Start continuous MoveNet detection
function startDetection() {
  if (!detector) {
    console.error('MoveNet detector not initialized');
    return;
  }

  detectionInterval = setInterval(async () => {
    if (!isRunning || video.readyState < 2) return;

    const poses = await detector.estimatePoses(video);
    drawResults(poses);
  }, 100); // Run roughly 10 FPS
}

// Draw pose keypoints and skeleton
function drawResults(poses) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!poses || poses.length === 0) return;

  const pose = poses[0];
  const keypoints = pose.keypoints.filter(k => k.score > 0.4);

  // Draw keypoints
  for (const kp of keypoints) {
    ctx.beginPath();
    ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#00ff88';
    ctx.fill();
  }

  // Draw skeleton lines
  const edges = [
    ['left_shoulder', 'right_shoulder'],
    ['left_hip', 'right_hip'],
    ['left_shoulder', 'left_elbow'],
    ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_elbow', 'right_wrist'],
    ['left_hip', 'left_knee'],
    ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'],
    ['right_knee', 'right_ankle'],
  ];

  const kpMap = Object.fromEntries(keypoints.map(kp => [kp.name, kp]));
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;

  for (const [p1, p2] of edges) {
    const a = kpMap[p1];
    const b = kpMap[p2];
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

// Cleanup when closing the tab
window.addEventListener('beforeunload', async () => {
  isRunning = false;
  clearInterval(detectionInterval);
  if (stream) stream.getTracks().forEach(track => track.stop());

  try {
    await chrome.storage.local.remove('monitoring-state');
  } catch (error) {
    console.error('Error clearing state:', error);
  }
});

// Initialize everything
(async () => {
  await initTF();
  await initMoveNet();
  await initCamera();
})();
