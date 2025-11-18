import React, { useState, useEffect } from 'react';
import { Camera, Activity, Settings, Eye } from 'lucide-react';

export default function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['monitoring-state', 'monitoring-tab'], (result) => {
      const monitoringState = result['monitoring-state'];
      if (monitoringState) setIsMonitoring(JSON.parse(monitoringState).isMonitoring);
    });
  }, []);

  useEffect(() => {
    const handleChange = (changes, areaName) => {
      if (areaName === 'local' && changes['monitoring-state']) {
        const newValue = changes['monitoring-state'].newValue;
        setIsMonitoring(newValue ? JSON.parse(newValue).isMonitoring : false);
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  const toggleMonitoring = () => {
    if (!isMonitoring) chrome.runtime.sendMessage({ type: "START_MONITORING" }, () => setIsMonitoring(true));
    else chrome.runtime.sendMessage({ type: "STOP_MONITORING" }, () => setIsMonitoring(false));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Posture Monitor</h1>
          </div>
          <p className="text-slate-300">AI-powered posture tracking to keep you healthy and productive</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isMonitoring ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/50' : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'}`}>
              {isMonitoring ? <Eye className="w-10 h-10 animate-pulse" /> : <Camera className="w-10 h-10" />}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-1">{isMonitoring ? 'Monitoring Active' : 'Ready to Start'}</h2>
              <p className="text-slate-300 text-sm">{isMonitoring ? 'Your posture is being tracked in real-time' : 'Click below to begin monitoring your posture'}</p>
            </div>
            <button onClick={toggleMonitoring} className={`px-10 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${isMonitoring ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/50' : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/50'}`}>
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
