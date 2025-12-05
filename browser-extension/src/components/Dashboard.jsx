// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock, TrendingUp, CheckCircle, Trophy } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Replace with your actual API endpoint
      const response = await fetch(`http://localhost:5000/dashboard/stats?user_id=user_001&days=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      } else {
        throw new Error(data.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Failed to load dashboard data</p>
      </div>
    );
  }

  const { hero_stats, posture_distribution, daily_trends, recent_sessions } = stats;

  // Pie chart colors
  const COLORS = {
    good: '#22c55e',
    bad: '#ef4444'
  };

  const pieData = [
    { name: 'Good Posture', value: posture_distribution.good },
    { name: 'Bad Posture', value: posture_distribution.bad }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Posture Monitor Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your posture health and monitor your progress</p>
          </div>
          <button
            onClick={() => window.location.href = '/rewards.html'}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Trophy className="w-5 h-5" />
            View Rewards
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last {days} days
            </button>
          ))}
        </div>

        {/* Hero Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            title="Total Sessions"
            value={hero_stats.total_sessions}
            color="blue"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            title="Monitoring Time"
            value={`${hero_stats.total_monitoring_time_hours}h`}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Posture Score"
            value={`${hero_stats.overall_posture_score}%`}
            color="green"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Corrections"
            value={hero_stats.total_corrections}
            color="orange"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Posture Trends Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Posture Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="day_label" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  label={{ 
                    value: 'Good Posture %', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: '12px', fill: '#6b7280' }
                  }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="good_percentage" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  name="Good Posture %"
                  dot={{ fill: '#22c55e', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Posture Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Posture Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.good : COLORS.bad} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">{posture_distribution.good} checks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">{posture_distribution.bad} checks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sessions</h2>
          {recent_sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No sessions found. Start monitoring to see your data here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Checks</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Good/Bad</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Corrections</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_sessions.map((session, index) => (
                    <tr key={session.session_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(session.start_time).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        <br/>
                        <span className="text-xs text-gray-500">
                          {new Date(session.start_time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{session.total_checks}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-green-600 font-medium">{session.good_count}</span>
                        {' / '}
                        <span className="text-red-600 font-medium">{session.bad_count}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          session.score >= 80 ? 'bg-green-100 text-green-800' :
                          session.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {session.score}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{session.corrections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;