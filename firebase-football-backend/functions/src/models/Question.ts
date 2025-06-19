
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

