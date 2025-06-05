import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface RulesSidebarProps {
  className?: string;
}

const RulesSidebar: React.FC<RulesSidebarProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'scoring' | 'tips'>('basic');

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-neutral-800">Go Rules Quick Guide</h2>
        <Link 
          to="/rules" 
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Full Rules →
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-200 mb-4">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'basic'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Basic Rules
        </button>
        <button
          onClick={() => setActiveTab('scoring')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scoring'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Scoring
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tips'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Tips
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'basic' && (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-800 text-sm mb-1">🎯 Objective</h4>
              <p className="text-blue-700 text-xs">
                Control more territory than your opponent by placing stones and capturing enemy groups.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold text-sm">1.</span>
                <div>
                  <p className="text-sm font-medium">Place stones on intersections</p>
                  <p className="text-xs text-neutral-600">Black plays first, then alternate</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-bold text-sm">2.</span>
                <div>
                  <p className="text-sm font-medium">Capture by removing liberties</p>
                  <p className="text-xs text-neutral-600">Surround enemy stones completely</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-bold text-sm">3.</span>
                <div>
                  <p className="text-sm font-medium">No suicide moves</p>
                  <p className="text-xs text-neutral-600">Can't place without liberties unless capturing</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold text-sm">4.</span>
                <div>
                  <p className="text-sm font-medium">Ko rule prevents loops</p>
                  <p className="text-xs text-neutral-600">Can't immediately recapture</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scoring' && (
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold text-green-800 text-sm mb-1">🏆 How to Win</h4>
              <p className="text-green-700 text-xs">
                Player with the most points wins!
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Territory Points</span>
                <span className="text-xs text-neutral-600">+1 per empty intersection</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Captured Stones</span>
                <span className="text-xs text-neutral-600">+1 per captured stone</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Komi (White bonus)</span>
                <span className="text-xs text-neutral-600">Usually +6.5 points</span>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h4 className="font-semibold text-yellow-800 text-sm mb-1">💡 Territory</h4>
              <p className="text-yellow-700 text-xs">
                Empty intersections completely surrounded by your stones count as your territory.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-3">
            <div className="bg-amber-50 p-3 rounded-lg">
              <h4 className="font-semibold text-amber-800 text-sm mb-1">🎲 For Beginners</h4>
              <p className="text-amber-700 text-xs">
                Start with 9×9 boards for quick games and learning!
              </p>
            </div>
            
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">📍 Opening Strategy</p>
                <p className="text-xs text-neutral-600">Play corners first, then sides, then center</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">🔗 Connect Your Stones</p>
                <p className="text-xs text-neutral-600">Connected groups share liberties and are stronger</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">👀 Count Liberties</p>
                <p className="text-xs text-neutral-600">Always check if your groups can be captured</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">🎯 Think Territory</p>
                <p className="text-xs text-neutral-600">Build walls around areas you want to control</p>
              </div>
            </div>
            
            <div className="bg-teal-50 p-3 rounded-lg">
              <h4 className="font-semibold text-teal-800 text-sm mb-1">⭐ Pro Tip</h4>
              <p className="text-teal-700 text-xs">
                Look for star points (hoshi) - they're good opening moves!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-neutral-200">
        <div className="flex flex-col gap-2">
          <Link
            to="/board-demo"
            className="text-center px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Demo Board
          </Link>
          <Link
            to="/rules"
            className="text-center px-3 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Read Complete Rules
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RulesSidebar; 