import React, { useState, useRef, useEffect } from 'react';
import { CameraOff, Play, Pause, Sun, Moon, Video, VideoOff } from 'lucide-react';

export default function PostureDetector() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [cameraReady, setCameraReady] = useState(false);
  const [offscreenReady, setOffscreenReady] = useState(false);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const animationRef = useRef(null);

 

useEffect(() => {
  async function loadCameraState() {
    try {
      const result = await chrome.storage.local.get(['cameraActive']);
      const isActive = result.cameraActive || false;
      setCameraReady(isActive);
      setShowCamera(isActive);
      setStatusMessage(isActive ? 'Camera Active' : 'Model ready');
    } catch {
      setStatusMessage('Unable to fetch camera status');
    }
  }

  loadCameraState();
}, []);



  // ✅ Initialize MoveNet + backend
  useEffect(() => {
    async function initModel() {
      try {
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
        await tf.ready();
        console.log('TensorFlow.js backend:', tf.getBackend());
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        detectorRef.current = detector;
        setStatusMessage('Model ready');
      } catch (error) {
        console.error('Failed to initialize model:', error);
        setStatusMessage('Model initialization failed');
      }
    }
    console.log('Loading model...');
    initModel();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // ✅ Handle camera actions
  useEffect(() => {
    async function handleCamera() {
      if (showCamera) {
        try {
          if (!offscreenReady) {
            setStatusMessage('Creating offscreen document...');
            await chrome.runtime.sendMessage({ type: 'createOffscreen' });
            setOffscreenReady(true);
            console.log('Offscreen document created');
          }

          setStatusMessage('Starting camera...');
          await chrome.runtime.sendMessage({ type: 'startCamera' });
          setCameraReady(true);
          setStatusMessage('Camera Active');
          console.log('Camera started');
        } catch (error) {
          console.error('Failed to setup camera:', error);
          setStatusMessage('Camera setup failed');
          setShowCamera(false);
          setCameraReady(false);
        }
      } else {
        if (offscreenReady && typeof chrome !== 'undefined' && chrome.runtime) {
          try {
            await chrome.runtime.sendMessage({ type: 'stopCamera' });
            console.log('Camera stopped');
          } catch (error) {
            console.error('Failed to stop camera:', error);
          }
        }
        setCameraReady(false);
        setIsMonitoring(false);
        cancelAnimationFrame(animationRef.current);
        setStatusMessage('Model ready');
      }
    }

    handleCamera();
  }, [showCamera]);

  const toggleCamera = () => setShowCamera(!showCamera);

  const toggleMonitoring = async () => {
    if (isMonitoring) {
      chrome.runtime.sendMessage({ type: 'stopMonitoring' });
      setIsMonitoring(false);
      setStatusMessage('Camera Active');
    } else {
      const response = await chrome.runtime.sendMessage({ type: 'startMonitoring' });
      if (response.success) {
        setIsMonitoring(true);
        setStatusMessage('Monitoring Active');
      } else {
        setStatusMessage('Failed to start monitoring');
      }
    }
  };

  

  const bgClass = darkMode
    ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50';

  const cardClass = darkMode
    ? 'bg-white/10 backdrop-blur-lg border border-white/20'
    : 'bg-white/70 backdrop-blur-lg border border-white/40';

  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const subtextClass = darkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-500 p-6`} style={{ width: '450px' }}>
      <div className="w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${textClass} mb-1`}>Posture Detective</h1>
            <p className={subtextClass}>Keep your spine happy 🦴</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-full ${cardClass} hover:scale-110 transition-transform duration-200`}
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-purple-600" />}
          </button>
        </div>

        <div className={`${cardClass} rounded-3xl p-6 mb-6 shadow-2xl`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`font-medium ${textClass}`}>{statusMessage}</span>
            </div>
          </div>
          <button
            onClick={toggleMonitoring}
            disabled={!showCamera || !cameraReady}
            className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 ${
              isMonitoring
                ? 'bg-gradient-to-r from-red-500 to-pink-500'
                : 'bg-gradient-to-r from-green-500 to-emerald-500'
            } ${!showCamera || !cameraReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              {isMonitoring ? (
                <>
                  <Pause className="w-5 h-5" /> Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" /> Start Monitoring
                </>
              )}
            </div>
          </button>
        </div>

        <div className={`${cardClass} rounded-3xl p-6 shadow-2xl`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${textClass}`}>Camera Feed</h2>
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-xl ${
                showCamera ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              } hover:scale-110 transition-transform duration-200`}
            >
              {showCamera ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-gray-900/50 aspect-video flex items-center justify-center">
            {showCamera ? (
              <div className="relative w-full h-full">
                <iframe
                  ref={iframeRef}
                  src={typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('offscreen.html') : ''}
                  className="w-full h-full border-none"
                  title="Camera Stream"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              </div>
            ) : (
              <div className="text-center">
                <CameraOff className={`w-12 h-12 ${subtextClass} mx-auto mb-2 opacity-50`} />
                <p className={`${subtextClass} text-sm`}>Camera preview disabled</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className={`text-sm ${subtextClass} opacity-70`}>AI-powered posture detection active ⚡</p>
        </div>
      </div>
    </div>
  );
}
