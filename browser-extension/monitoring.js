import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const postureStatus = document.getElementById('postureStatus');

let stream = null;
let isRunning = false;
let detector = null;
let detectionIntervalId = null;
let lastPostureWasGood = true;
let triangleAlpha = 0.15;
let badPostureCount = 0;
let sessionStartTime = Date.now();
let goodPostureFrames = 0;
let totalFrames = 0;

// Backend integration
const API_BASE_URL = 'http://localhost:5000/api';
let sessionId = null;
let reportInterval = null;
let currentPostureData = {
  status: null,
  leftAngle: 0,
  rightAngle: 0,
  totalAngle: 0,
  issues: [],
  feedback: '',
  wasLastBad: false
};

const ANGLE_THRESHOLD = 80;
const DETECTION_INTERVAL = 200;

// KEEP-ALIVE MECHANISM
let keepAliveInterval = null;
function startKeepAlive() {
  keepAliveInterval = setInterval(() => {
    if (isRunning) {
      chrome.runtime.sendMessage({ type: "KEEP_ALIVE" }).catch(() => {});
    }
  }, 500);
}

function stopKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
}

// Start backend session
async function startBackendSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'user_001' })
    });
    const data = await response.json();
    if (data.success) {
      sessionId = data.session_id;
      console.log('Backend session started:', sessionId);
      reportInterval = setInterval(reportToBackend, 10000);
    }
  } catch (err) {
    console.error('Failed to start backend session:', err);
  }
}

// Report posture data
async function reportToBackend() {
  if (!sessionId || !currentPostureData.status) return;

  try {
    const reportData = {
      session_id: sessionId,
      posture_status: currentPostureData.status,
      left_angle: Math.round(currentPostureData.leftAngle),
      right_angle: Math.round(currentPostureData.rightAngle),
      total_angle: Math.round(currentPostureData.totalAngle),
      issues: currentPostureData.issues,
      feedback: currentPostureData.feedback,
      was_corrected: currentPostureData.wasLastBad && currentPostureData.status === 'good',
      duration_seconds: 10
    };

    await fetch(`${API_BASE_URL}/posture/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });

    currentPostureData.wasLastBad = currentPostureData.status === 'bad';
  } catch (err) {
    console.error('Failed to report to backend:', err);
  }
}

// End backend session
async function endBackendSession() {
  if (!sessionId) return;

  try {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const percentage = totalFrames > 0 ? Math.round((goodPostureFrames / totalFrames) * 100) : 0;

    await fetch(`${API_BASE_URL}/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        total_duration: elapsed,
        good_posture_percentage: percentage,
        total_corrections: badPostureCount
      })
    });

    console.log('Backend session ended');
  } catch (err) {
    console.error('Failed to end backend session:', err);
  }
}

// Update stats UI
function updateStats() {
  const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.getElementById('sessionTime').textContent = `${minutes}:${seconds.toString().padStart(2,'0')}`;

  const percentage = totalFrames > 0 ? Math.round((goodPostureFrames / totalFrames) * 100) : 0;
  document.getElementById('goodPostureTime').textContent = `${percentage}%`;
  document.getElementById('alertCount').textContent = badPostureCount;
}

// Camera initialization
async function initCamera() {
  try {
    status.textContent = 'Accessing Camera...';
    postureStatus.innerHTML = `<span class="icon">📷</span><div class="label">Camera Starting...</div><div class="details">Requesting camera access</div>`;

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });

    video.srcObject = stream;
    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      status.textContent = '✓ Camera Active';

      await tf.setBackend('webgl');
      await tf.ready();
      detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      });

      status.textContent = '✓ Model Ready';
      postureStatus.innerHTML = `<span class="icon">✨</span><div class="label">Ready to Monitor</div><div class="details">Position yourself in frame</div>`;
      postureStatus.className = 'posture-status warning';

      isRunning = true;
      startDetectionLoop();
      startKeepAlive();
      setInterval(updateStats, 1000);
      await startBackendSession();
    };
  } catch (err) {
    console.error('Camera error:', err);
    status.textContent = '✗ Camera Denied';
    postureStatus.innerHTML = `<span class="icon">⚠️</span><div class="label">Camera Access Required</div><div class="details">Please allow camera access</div>`;
    postureStatus.className = 'posture-status bad';
  }
}

// Calculate angles
function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y-b.y, c.x-b.x) - Math.atan2(a.y-b.y, a.x-b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function analyzeShoulderAngles(keypoints) {
  const kp = Object.fromEntries(keypoints.map(k=>[k.name,k]));
  const nose = kp['nose'], leftShoulder = kp['left_shoulder'], rightShoulder = kp['right_shoulder'];
  if (!nose || !leftShoulder || !rightShoulder) return { isGood:null, issues:['Position yourself in frame'], leftAngle:0, rightAngle:0, totalAngle:0 };

  const leftAngle = calculateAngle(rightShoulder,leftShoulder,nose);
  const rightAngle = calculateAngle(leftShoulder,rightShoulder,nose);
  const totalAngle = leftAngle + rightAngle;
  const isGood = totalAngle >= ANGLE_THRESHOLD;
  const issues = [], feedback = isGood ? `Good angles (L:${Math.round(leftAngle)},R:${Math.round(rightAngle)})` : `Head too forward (L:${Math.round(leftAngle)},R:${Math.round(rightAngle)})`;

  currentPostureData.status = isGood ? 'good':'bad';
  currentPostureData.leftAngle = leftAngle;
  currentPostureData.rightAngle = rightAngle;
  currentPostureData.totalAngle = totalAngle;
  currentPostureData.issues = issues;
  currentPostureData.feedback = feedback;

  return { isGood, issues:[feedback], nose, leftShoulder, rightShoulder, leftAngle, rightAngle, totalAngle };
}

// Update UI
function updatePostureDisplay(result) {
  if (result.isGood === null) {
    postureStatus.innerHTML = `<span class="icon">⚠️</span><div class="label">Adjust Position</div><div class="details">${result.issues[0]}</div>`;
    postureStatus.className = 'posture-status warning';
    return;
  }

  totalFrames++;
  if (result.isGood) goodPostureFrames++;
  if (lastPostureWasGood && !result.isGood) badPostureCount++;
  lastPostureWasGood = result.isGood;

  postureStatus.innerHTML = result.isGood
    ? `<span class="icon">✅</span><div class="label">Good Posture</div><div class="details">${result.issues[0]}</div>`
    : `<span class="icon">❌</span><div class="label">Poor Posture</div><div class="details">${result.issues[0]}</div>`;
  postureStatus.className = result.isGood ? 'posture-status good':'posture-status bad';
}

// Draw triangle overlay
function drawTriangle(result) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const { nose,leftShoulder,rightShoulder,isGood } = result;
  if (!nose || !leftShoulder || !rightShoulder) return;
  const color = isGood===null?'#fbbf24':isGood?'#10b981':'#ef4444';
  triangleAlpha += (0.15-triangleAlpha)*0.1;

  ctx.beginPath();
  ctx.moveTo(nose.x,nose.y);
  ctx.lineTo(leftShoulder.x,leftShoulder.y);
  ctx.lineTo(rightShoulder.x,rightShoulder.y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.globalAlpha = triangleAlpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  for(const point of [nose,leftShoulder,rightShoulder]){
    ctx.beginPath();
    ctx.arc(point.x,point.y,6,0,2*Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ----- NEW: Detection loop using setInterval -----
function startDetectionLoop() {
  detectionIntervalId = setInterval(async () => {
    if (!isRunning || !detector) return;
    try {
      const poses = await detector.estimatePoses(video);
      if (poses.length>0){
        const keypoints = poses[0].keypoints.filter(k=>k.score>0.4);
        const result = analyzeShoulderAngles(keypoints);
        updatePostureDisplay(result);
        drawTriangle(result);

        chrome.runtime.sendMessage({ type: "POSE_ANGLE_UPDATE", angle: result.totalAngle }).catch(()=>{});
      }
    } catch(err){console.error('Detection error:',err);}
  }, DETECTION_INTERVAL);
}

// Stop everything
function stopDetectionLoop() {
  if (detectionIntervalId) clearInterval(detectionIntervalId);
}

// Cleanup on unload
window.addEventListener('beforeunload', async () => {
  isRunning = false;
  stopKeepAlive();
  stopDetectionLoop();
  if (reportInterval) clearInterval(reportInterval);
  if (stream) stream.getTracks().forEach(t=>t.stop());
  await endBackendSession();
  if (chrome?.storage?.local) await chrome.storage.local.set({'monitoring-state': JSON.stringify({isMonitoring:false})});
});

(async()=>{ await initCamera(); })();
