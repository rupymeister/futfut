

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