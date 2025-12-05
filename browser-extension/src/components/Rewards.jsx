import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, TrendingUp, Clock, Target } from 'lucide-react';

const RewardsDashboard = () => {
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRewardsData();
  }, []);

  const fetchRewardsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5000/api/rewards/user/user_001/achievements');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRewards(data);
      } else {
        throw new Error(data.error || 'Failed to fetch rewards data');
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rewards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Rewards</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchRewardsData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!rewards) return null;

  const { total_points, level, next_level_points, points_to_next_level, unlocked_badges, locked_badges, points_history } = rewards;
  
  const levelProgress = ((total_points % next_level_points) / next_level_points) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Rewards & Achievements
          </h1>
          <p className="text-gray-600">Track your progress and unlock badges!</p>
        </div>

        {/* Level & Points Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-2 border-purple-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Level {level}</h2>
              <p className="text-gray-600">Keep going to reach Level {level + 1}!</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                {total_points}
              </div>
              <p className="text-sm text-gray-600">Total Points</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress to Level {level + 1}</span>
              <span>{points_to_next_level} points to go</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Your Badges</h2>
            <span className="ml-auto bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
              {unlocked_badges.length} / {unlocked_badges.length + locked_badges.length} Unlocked
            </span>
          </div>
          
          {/* Unlocked Badges */}
          {unlocked_badges.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Unlocked Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {unlocked_badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} unlocked={true} />
                ))}
              </div>
            </div>
          )}
          
          {/* Locked Badges */}
          {locked_badges.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Locked Badges</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {locked_badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} unlocked={false} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Points History */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900">Points History</h2>
          </div>
          
          {points_history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No points earned yet. Start monitoring to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {points_history.slice().reverse().map((entry, index) => (
                <PointsHistoryItem key={index} entry={entry} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const BadgeCard = ({ badge, unlocked }) => {
  return (
    <div 
      className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
        unlocked 
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md hover:shadow-lg transform hover:scale-105' 
          : 'bg-gray-50 border-gray-300 opacity-60'
      }`}
    >
      {unlocked && (
        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
          <Star className="w-4 h-4 text-white fill-white" />
        </div>
      )}
      
      <div className="text-center">
        <div className={`text-5xl mb-2 ${unlocked ? '' : 'grayscale opacity-50'}`}>
          {badge.icon}
        </div>
        <h3 className={`font-bold mb-1 ${unlocked ? 'text-gray-900' : 'text-gray-600'}`}>
          {badge.name}
        </h3>
        <p className={`text-xs mb-2 ${unlocked ? 'text-gray-600' : 'text-gray-500'}`}>
          {badge.description}
        </p>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
          unlocked ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'
        }`}>
          <Trophy className="w-3 h-3" />
          {badge.points} pts
        </div>
      </div>
      
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-30 rounded-xl">
          <div className="bg-white rounded-full p-2">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

const PointsHistoryItem = ({ entry }) => {
  const date = new Date(entry.timestamp);
  const isPositive = entry.points > 0;
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
          {entry.badge_id ? (
            <Trophy className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
          ) : (
            <Target className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{entry.reason}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </p>
        </div>
      </div>
      <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{entry.points}
      </div>
    </div>
  );
};

export default RewardsDashboard;