import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Play, Pause, Sun, Moon, Video, VideoOff } from 'lucide-react';
import './index.css';

export default function PostureDetector() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [cameraPermission, setCameraPermission] = useState('prompt');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (showCamera && cameraPermission === 'granted') {
      startCamera();
    } else if (!showCamera && stream) {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setStream(mediaStream);
      setCameraPermission('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraPermission('denied');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring && !showCamera) {
      setShowCamera(true);
    }
  };

  const toggleCamera = () => {
    setShowCamera(!showCamera);
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
    <div className={`min-h-screen ${bgClass} transition-colors duration-500 p-6`}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${textClass} mb-1`}>
              Posture Detective
            </h1>
            <p className={subtextClass}>Keep your spine happy 🦴</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-full ${cardClass} hover:scale-110 transition-transform duration-200`}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-300" />
            ) : (
              <Moon className="w-5 h-5 text-purple-600" />
            )}
          </button>
        </div>

        {/* Status Card */}
        <div className={`${cardClass} rounded-3xl p-6 mb-6 shadow-2xl transition-all duration-300`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`font-medium ${textClass}`}>
                {isMonitoring ? 'Monitoring Active' : 'Monitoring Paused'}
              </span>
            </div>
          </div>

          {/* Main Control Button */}
          <button
            onClick={toggleMonitoring}
            className={`w-full py-4 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 ${
              isMonitoring
                ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isMonitoring ? (
                <>
                  <Pause className="w-5 h-5" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Monitoring
                </>
              )}
            </div>
          </button>
        </div>

        {/* Camera Preview Card */}
        <div className={`${cardClass} rounded-3xl p-6 shadow-2xl transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className={`w-5 h-5 ${textClass}`} />
              <h2 className={`text-lg font-semibold ${textClass}`}>Camera Feed</h2>
            </div>
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-xl ${
                showCamera 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              } hover:scale-110 transition-transform duration-200`}
            >
              {showCamera ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Camera View */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-900/50 aspect-video">
            {showCamera ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {cameraPermission === 'denied' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 backdrop-blur-sm">
                    <div className="text-center p-4">
                      <CameraOff className="w-12 h-12 text-red-300 mx-auto mb-2" />
                      <p className="text-white font-medium">Camera access denied</p>
                      <p className="text-gray-300 text-sm mt-1">Please enable camera permissions</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <CameraOff className={`w-12 h-12 ${subtextClass} mx-auto mb-2 opacity-50`} />
                  <p className={`${subtextClass} text-sm`}>Camera preview disabled</p>
                </div>
              </div>
            )}
          </div>

          {/* Info Badge */}
          <div className={`mt-4 p-3 rounded-xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>
              💡 <span className="font-medium">Next:</span> MoveNet pose detection will be integrated here
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className={`text-sm ${subtextClass} opacity-70`}>
            AI-powered posture detection coming soon
          </p>
        </div>
      </div>
    </div>
  );
}