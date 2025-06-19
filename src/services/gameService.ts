interface GameQuestion {
  questionNumber: number;
  rowFeature: string;
  rowFeatureType: 'team' | 'role' | 'nationality';
  colFeature: string;
  colFeatureType: 'team' | 'role' | 'nationality';
  correctAnswers: string[];
  cellPosition: {
    row: number;
    col: number;
  };
}

interface GameAnswer {
  questionId: string;
  playerGuess: string;
  isCorrect: boolean;
  matchedPlayerName?: string;
  allPossibleAnswers: string[];
  gameMode: 'single' | 'multiplayer';
  turnNumber?: number;
}

class GameApiService {
  private baseUrl: string;

  constructor() {
    // Use production Firebase Functions URL
    this.baseUrl = import.meta.env.VITE_API_URL || 
                   'https://us-central1-futfut-6a19f.cloudfunctions.net/api';
                   
    console.log('🌐 API Base URL:', this.baseUrl);
  }

  // Test connection before making requests
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend connection successful:', result);
        return true;
      } else {
        console.warn('⚠️ Backend health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    }
  }

  async createGame(
    playerId: string, 
    sessionId: string, 
    gameMode: 'single' | 'multiplayer',
    questions: GameQuestion[],
    player2Id?: string
  ) {
    try {
      console.log('📡 Creating game with data:', {
        playerId,
        sessionId,
        gameMode,
        questionsCount: questions.length,
        player2Id
      });

      const response = await fetch(`${this.baseUrl}/games`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          playerId,
          sessionId,
          gameMode,
          player2Id,
          questions
        })
      });

      const responseText = await response.text();
      console.log('📡 Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
      }

      const result = JSON.parse(responseText);
      if (result.success) {
        console.log(`✅ ${gameMode} game created successfully:`, result.data.game.id);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('❌ Error creating game:', error);
      throw error;
    }
  }

  async submitAnswer(gameId: string, answer: GameAnswer) {
    try {
      const playerId = localStorage.getItem('playerId') || `player_${Date.now()}`;
      
      const response = await fetch(`${this.baseUrl}/games/${gameId}/answers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...answer,
          playerId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log('✅ Answer submitted successfully');
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      throw error;
    }
  }

  async getGameDetails(gameId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get game details');
      }
    } catch (error) {
      console.error('Error getting game details:', error);
      throw error;
    }
  }

  async endGame(gameId: string, winnerId?: string) {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/end`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ winnerId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        console.log('✅ Game ended successfully');
        return result;
      } else {
        throw new Error(result.error || 'Failed to end game');
      }
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  }
}

export const gameApi = new GameApiService();
export type { GameQuestion, GameAnswer };