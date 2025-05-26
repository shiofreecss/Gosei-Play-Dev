import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GoseiLogo from '../components/GoseiLogo';

interface RulesSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const RulesSection: React.FC<RulesSectionProps> = ({ title, children, isOpen, onToggle }) => (
  <div className="border border-neutral-200 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 bg-neutral-50 hover:bg-neutral-100 text-left flex items-center justify-between transition-colors"
    >
      <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>
      <svg
        className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
    {isOpen && (
      <div className="px-6 py-4 bg-white">
        {children}
      </div>
    )}
  </div>
);

const RulesPage: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic-rules']));

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <GoseiLogo size={48} />
            <h1 className="text-4xl font-bold text-primary-700">Go Rules & Guide</h1>
          </div>
          <p className="text-xl text-neutral-600">
            Learn the ancient game of Go (Weiqi/Baduk)
          </p>
        </header>

        {/* Navigation */}
        <div className="max-w-4xl mx-auto mb-6">
          <Link 
            to="/board-demo" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Board Demo
          </Link>
        </div>

        {/* Rules Content */}
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Game Overview */}
          <RulesSection
            title="🎯 Game Overview"
            isOpen={openSections.has('overview')}
            onToggle={() => toggleSection('overview')}
          >
            <div className="space-y-4">
              <p className="text-neutral-700">
                Go is an ancient board game for two players that originated in China over 4,000 years ago. 
                It's known as <strong>Weiqi</strong> in Chinese, <strong>Baduk</strong> in Korean, and <strong>Go</strong> in Japanese.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Objective</h4>
                <p className="text-blue-700">
                  Control more territory than your opponent by placing stones and capturing enemy groups.
                </p>
              </div>
            </div>
          </RulesSection>

          {/* Basic Rules */}
          <RulesSection
            title="📋 Basic Rules"
            isOpen={openSections.has('basic-rules')}
            onToggle={() => toggleSection('basic-rules')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">1. Placing Stones</h4>
                  <p className="text-green-700">
                    Players alternate placing black and white stones on line intersections.
                    Black always plays first.
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">2. No Moving</h4>
                  <p className="text-purple-700">
                    Once placed, stones cannot be moved. They can only be captured and removed.
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">3. Passing</h4>
                  <p className="text-orange-700">
                    Players can pass their turn. When both players pass consecutively, the game ends.
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">4. No Suicide</h4>
                  <p className="text-red-700">
                    You cannot place a stone that would have no liberties unless it captures enemy stones.
                  </p>
                </div>
              </div>
            </div>
          </RulesSection>

          {/* Capturing */}
          <RulesSection
            title="⚔️ Capturing Stones"
            isOpen={openSections.has('capturing')}
            onToggle={() => toggleSection('capturing')}
          >
            <div className="space-y-4">
              <p className="text-neutral-700">
                Stones are captured when they have no empty adjacent intersections (liberties).
              </p>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Liberties</h4>
                <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                  <li>Each empty intersection adjacent to a stone is a <strong>liberty</strong></li>
                  <li>Connected stones of the same color share liberties</li>
                  <li>Groups with zero liberties are captured and removed</li>
                  <li>Diagonally adjacent stones are not connected</li>
                </ul>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">Capture Process</h4>
                <ol className="list-decimal pl-5 space-y-1 text-red-700">
                  <li>Place a stone that removes the last liberty of an enemy group</li>
                  <li>All stones in that group are immediately captured</li>
                  <li>Captured stones are removed from the board</li>
                  <li>Captured stones count as points for the capturing player</li>
                </ol>
              </div>
            </div>
          </RulesSection>

          {/* Ko Rule */}
          <RulesSection
            title="🔄 Ko Rule"
            isOpen={openSections.has('ko-rule')}
            onToggle={() => toggleSection('ko-rule')}
          >
            <div className="space-y-4">
              <p className="text-neutral-700">
                The Ko rule prevents infinite loops of capture and recapture.
              </p>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-semibold text-indigo-800 mb-2">Ko Situation</h4>
                <ul className="list-disc pl-5 space-y-1 text-indigo-700">
                  <li>When a single stone captures a single stone</li>
                  <li>The captured position creates an immediate recapture opportunity</li>
                  <li>The player cannot immediately recapture</li>
                  <li>They must play elsewhere first, then can recapture if the position is still available</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Purpose</h4>
                <p className="text-blue-700">
                  This rule prevents games from continuing indefinitely and adds strategic depth to corner and edge fights.
                </p>
              </div>
            </div>
          </RulesSection>

          {/* Territory and Scoring */}
          <RulesSection
            title="🏆 Territory & Scoring"
            isOpen={openSections.has('scoring')}
            onToggle={() => toggleSection('scoring')}
          >
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Territory</h4>
                <ul className="list-disc pl-5 space-y-1 text-green-700">
                  <li>Empty intersections completely surrounded by one color</li>
                  <li>Must be completely enclosed with no escape routes</li>
                  <li>Each empty intersection in your territory = 1 point</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Final Score</h4>
                <ul className="list-disc pl-5 space-y-1 text-purple-700">
                  <li><strong>Territory points:</strong> Empty intersections you control</li>
                  <li><strong>Capture points:</strong> Enemy stones you captured</li>
                  <li><strong>Komi:</strong> Compensation points for White (usually 6.5)</li>
                  <li><strong>Winner:</strong> Player with the highest total score</li>
                </ul>
              </div>
            </div>
          </RulesSection>

          {/* Board Sizes */}
          <RulesSection
            title="📐 Board Sizes"
            isOpen={openSections.has('board-sizes')}
            onToggle={() => toggleSection('board-sizes')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-emerald-800">9×9 Board</h4>
                  <p className="text-emerald-700 text-sm mt-1">Quick games (20-30 min)</p>
                  <p className="text-emerald-600 text-xs mt-2">Perfect for beginners</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800">13×13 Board</h4>
                  <p className="text-blue-700 text-sm mt-1">Medium games (45-60 min)</p>
                  <p className="text-blue-600 text-xs mt-2">Good for intermediate players</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800">19×19 Board</h4>
                  <p className="text-purple-700 text-sm mt-1">Full games (90-120 min)</p>
                  <p className="text-purple-600 text-xs mt-2">Tournament standard</p>
                </div>
              </div>
              <div className="text-center">
                <Link 
                  to="/board-demo" 
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Different Board Sizes
                  <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </RulesSection>

          {/* Strategy Tips */}
          <RulesSection
            title="💡 Strategy Tips"
            isOpen={openSections.has('strategy')}
            onToggle={() => toggleSection('strategy')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">Opening (Fuseki)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-amber-700 text-sm">
                    <li>Play in corners first - they're easier to secure</li>
                    <li>Avoid the edges and center early</li>
                    <li>Look for star points (marked intersections)</li>
                  </ul>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-teal-800 mb-2">Middle Game</h4>
                  <ul className="list-disc pl-5 space-y-1 text-teal-700 text-sm">
                    <li>Connect your stones to form strong groups</li>
                    <li>Attack weak enemy groups</li>
                    <li>Build territory while maintaining balance</li>
                  </ul>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-rose-800 mb-2">Endgame (Yose)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-rose-700 text-sm">
                    <li>Secure your territory boundaries</li>
                    <li>Play the largest moves first</li>
                    <li>Count territory to assess the position</li>
                  </ul>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-cyan-800 mb-2">General Advice</h4>
                  <ul className="list-disc pl-5 space-y-1 text-cyan-700 text-sm">
                    <li>Think before you play - stones can't be moved</li>
                    <li>Learn basic patterns and shapes</li>
                    <li>Practice life and death problems</li>
                  </ul>
                </div>
              </div>
            </div>
          </RulesSection>

          {/* Quick Reference */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">Quick Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-neutral-800 mb-2">✅ You Can:</h4>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600">
                  <li>Place stones on intersections</li>
                  <li>Capture enemy groups with no liberties</li>
                  <li>Pass your turn</li>
                  <li>Resign if the position is hopeless</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-neutral-800 mb-2">❌ You Cannot:</h4>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600">
                  <li>Move stones once placed</li>
                  <li>Place stones on occupied intersections</li>
                  <li>Make suicide moves (usually)</li>
                  <li>Immediately recapture in Ko</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-neutral-800 mb-2">🎯 Remember:</h4>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600">
                  <li>Territory + Captures = Score</li>
                  <li>Connected stones share liberties</li>
                  <li>White gets komi (compensation)</li>
                  <li>Practice makes perfect!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center py-8">
            <h3 className="text-2xl font-semibold mb-4">Ready to Play?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/board-demo"
                className="px-6 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-md"
              >
                Practice on Demo Board
              </Link>
              <Link
                to="/"
                className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-md"
              >
                Start a Real Game
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesPage; 