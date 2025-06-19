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

