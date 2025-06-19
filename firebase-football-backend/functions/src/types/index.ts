export interface Game {
  id: string;
  playerId: string;
  sessionId: string;
  gameMode: 'single' | 'multiplayer';
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'abandoned';
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  score: number;
  // Multiplayer specific fields
  player1Id?: string;
  player2Id?: string;
  currentTurn?: string; // player ID whose turn it is
  player1Score?: number;
  player2Score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  gameId: string;
  questionNumber: number;
  rowFeature: string;
  rowFeatureType: 'team' | 'role' | 'nationality';
  colFeature: string;
  colFeatureType: 'team' | 'role' | 'nationality';
  correctAnswers: string[]; // All possible correct player names from JSON
  cellPosition: {
    row: number;
    col: number;
  };
  isAnswered: boolean;
  answeredBy?: string; // playerId who answered (for multiplayer)
  createdAt: Date;
}

export interface Answer {
  id: string;
  gameId: string;
  questionId: string;
  playerId: string;
  playerGuess: string;
  isCorrect: boolean;
  matchedPlayerName?: string; // The actual player name that matched from JSON
  allPossibleAnswers: string[]; // All correct answers for this question
  gameMode: 'single' | 'multiplayer';
  turnNumber?: number; // For multiplayer games
  timestamp: Date;
}

export interface Player {
  id: string;
  name?: string;
  sessionCount: number;
  totalGuesses: number;
  correctGuesses: number;
  singlePlayerGames: number;
  multiplayerGames: number;
  singlePlayerWins: number;
  multiplayerWins: number;
  createdAt: Date;
  updatedAt: Date;
}