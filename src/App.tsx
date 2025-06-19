import { useState } from 'react';
import './App.css';
import Game from './components/Game';
import { MultiplayerGame } from './components/MultiplayerGame';
import { GameModeSelector } from './components/GameModeSelector';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { type EnhancedPlayer } from './types/playerTypes';

function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'single' | 'multiplayer' | 'analytics'>('menu');

  // Empty players array since we're using the JSON data
  const players: EnhancedPlayer[] = [];

  const handleModeSelect = (mode: 'single' | 'multiplayer' | 'analytics') => {
    setGameMode(mode);
  };

  const handleBackToMenu = () => {
    setGameMode('menu');
  };

  return (
    <div className="App">
      {gameMode === 'menu' && (
        <GameModeSelector onModeSelect={handleModeSelect} />
      )}
      
      {gameMode === 'single' && (
        <Game 
          players={players} 
          onBackToMenu={handleBackToMenu}
        />
      )}
      
      {gameMode === 'multiplayer' && (
        <MultiplayerGame 
          players={players} 
          onBackToMenu={handleBackToMenu}
        />
      )}
      
      {gameMode === 'analytics' && (
        <AnalyticsDashboard onClose={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
