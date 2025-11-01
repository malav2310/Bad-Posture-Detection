import React, { useState, useEffect } from 'react';
import { Camera, Activity, Settings, Clock, TrendingUp, Eye } from 'lucide-react';

export default function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stats, setStats] = useState({
    sessionTime: 0,
    alerts: 0,
    goodPosture: 0
  });

  // Load saved state when popup opens
  useEffect(() => {
    chrome.storage.local.get(['monitoring-state', 'monitoring-tab'], (result) => {
      const monitoringState = result['monitoring-state'];
      if (monitoringState) {
        const state = JSON.parse(monitoringState);
        setIsMonitoring(state.isMonitoring);
        setStats(state.stats);
      }
    });
  }, []);

  // Listen for state updates from other contexts (monitoring.js)
  useEffect(() => {
    const handleChange = (changes, areaName) => {
      if (areaName === 'local' && changes['monitoring-state']) {
        const newValue = changes['monitoring-state'].newValue;
        if (newValue) {
          const state = JSON.parse(newValue);
          setIsMonitoring(state.isMonitoring);
          setStats(state.stats);
        } else {
          setIsMonitoring(false);
          setStats({ sessionTime: 0, alerts: 0, goodPosture: 0 });
        }
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  // Update session time locally while active
  useEffect(() => {
    let interval;
    if (isMonitoring) {
      interval = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          sessionTime: prev.sessionTime + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Format HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle monitoring
  const toggleMonitoring = async () => {
    if (!isMonitoring) {
      // Start monitoring: open new tab and save tab ID
      const newState = {
        isMonitoring: true,
        stats: { sessionTime: 0, alerts: 0, goodPosture: 0 }
      };
      await chrome.storage.local.set({
        'monitoring-state': JSON.stringify(newState)
      });

      chrome.tabs.create({ url: 'monitoring.html' }, async (tab) => {
        await chrome.storage.local.set({ 'monitoring-tab': tab.id });
      });

      setIsMonitoring(true);
      setStats(newState.stats);
    } else {
      // Stop monitoring: close tab and clear state
      chrome.storage.local.get('monitoring-tab', async (result) => {
        const tabId = result['monitoring-tab'];
        if (tabId) {
          try {
            await chrome.tabs.remove(tabId);
          } catch (err) {
            console.log('Tab already closed or not found');
          }
        }
        await chrome.storage.local.remove(['monitoring-state', 'monitoring-tab']);
        setIsMonitoring(false);
        setStats({ sessionTime: 0, alerts: 0, goodPosture: 0 });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Posture Monitor
            </h1>
          </div>
          <p className="text-slate-300">
            AI-powered posture tracking to keep you healthy and productive
          </p>
        </div>

        {/* Main Control */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isMonitoring
                  ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/50'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
              }`}
            >
              {isMonitoring ? (
                <Eye className="w-10 h-10 animate-pulse" />
              ) : (
                <Camera className="w-10 h-10" />
              )}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-semibold mb-1">
                {isMonitoring ? 'Monitoring Active' : 'Ready to Start'}
              </h2>
              <p className="text-slate-300 text-sm">
                {isMonitoring
                  ? 'Your posture is being tracked in real-time'
                  : 'Click below to begin monitoring your posture'}
              </p>
            </div>

            <button
              onClick={toggleMonitoring}
              className={`px-10 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                isMonitoring
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/50'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/50'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-slate-200">Session Time</h3>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {formatTime(stats.sessionTime)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold text-slate-200">Posture Alerts</h3>
            </div>
            <p className="text-2xl font-bold text-orange-400">{stats.alerts}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-slate-200">Good Posture</h3>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {stats.goodPosture}%
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-semibold">How It Works</h3>
          </div>
          <div className="space-y-3 text-slate-300">
            <p>• Click "Start Monitoring" to open the camera in a new window</p>
            <p>• The AI will analyze your posture in real-time using your webcam</p>
            <p>• Get instant alerts when poor posture is detected</p>
            <p>• Track your progress with detailed statistics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
