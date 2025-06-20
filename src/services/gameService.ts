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
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

    this.baseUrl = isDevelopment
      ? 'http://localhost:5001/futfut-6a19f/us-central1/api'  // Make sure this is 'api'
      : 'https://us-central1-futfut-6a19f.cloudfunctions.net/api'; // Make sure this is 'api'
      
    console.log('🌐 API Base URL:', this.baseUrl);
    console.log('🔧 Development mode:', isDevelopment);
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

async submitAnswer(gameId: string, answerData: any) {
  try {
    console.log('📡 Submitting answer:', { gameId, answerData });

    // Only send the required fields that backend expects
    const requestData = {
      playerId: answerData.playerId || localStorage.getItem('playerId') || `player_${Date.now()}`,
      questionNumber: answerData.questionNumber || 1,
      playerName: answerData.playerName || answerData.playerGuess || answerData.guess,
      rowFeature: answerData.rowFeature,
      colFeature: answerData.colFeature,
      // Additional tracking data (optional for backend)
      isCorrect: answerData.isCorrect,
      matchedPlayerName: answerData.matchedPlayerName
    };

    console.log('📡 Request data being sent to backend:', requestData);

    const response = await fetch(`${this.baseUrl}/games/${gameId}/answers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Submit answer error:', errorText);
      throw new Error(`Failed to submit answer: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Answer submitted successfully:', result);
    
    return result.data;
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

   // Method to validate questions before creating game
  async validateQuestions(questions: GameQuestion[]): Promise<{
    isValid: boolean;
    summary: any;
    details: any[];
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/games/validate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ questions })
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        isValid: result.summary.canCreateGame,
        summary: result.summary,
        details: result.details,
        message: result.message
      };
    } catch (error) {
      console.error('❌ Error validating questions:', error);
      throw error;
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
      // Validate questions first
      console.log('🔍 Validating questions before game creation...');
      const validation = await this.validateQuestions(questions);
      
      if (!validation.isValid) {
        const errorMessage = `Cannot create game: ${validation.message}\n\n` +
          `Issues found:\n${validation.details
            .filter(q => !q.meetsMinimum)
            .map(q => `• Question ${q.questionNumber}: ${q.issues.join(', ')}`)
            .join('\n')}`;
        
        throw new Error(errorMessage);
      }

      console.log('✅ Question validation passed');
      console.log('📡 Creating game with validated questions...');

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

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            errorMessage = errorData.error;
            
            if (errorData.details && errorData.details.validationErrors) {
              errorMessage += '\n\nValidation Issues:\n' + 
                errorData.details.validationErrors.join('\n');
            }
          }
        } catch (parseError) {
          errorMessage += `, response: ${responseText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      if (result.success) {
        console.log(`✅ ${gameMode} game created successfully:`, result.data.game.id);
        console.log(`📊 Validation summary:`, result.validation);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('❌ Error creating game:', error);
      throw error;
    }
  }
}

export const gameApi = new GameApiService();
export type { GameQuestion, GameAnswer };