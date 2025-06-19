
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