import { db } from '../index';
import { Game, Question, Answer, Player } from '../types';
import * as admin from 'firebase-admin';

export const createGame = async (gameData: {
  playerId: string;
  sessionId: string;
  gameMode: 'single' | 'multiplayer';
  player2Id?: string;
  questions: Omit<Question, 'id' | 'gameId' | 'createdAt' | 'isAnswered' | 'answeredBy'>[];
}) => {
  const batch = db.batch();
  
  // Create game
  const gameRef = db.collection('games').doc();
  
  // Base game data that's always included
  const baseGameData = {
    id: gameRef.id,
    playerId: gameData.playerId,
    sessionId: gameData.sessionId,
    gameMode: gameData.gameMode,
    startTime: new Date(),
    status: 'active' as const,
    totalQuestions: gameData.questions.length,
    answeredQuestions: 0,
    correctAnswers: 0,
    score: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Only add multiplayer fields if it's a multiplayer game
  const gameToCreate: any = { ...baseGameData };
  
  if (gameData.gameMode === 'multiplayer') {
    gameToCreate.player1Id = gameData.playerId;
    gameToCreate.player2Id = gameData.player2Id;
    gameToCreate.currentTurn = gameData.playerId;
    gameToCreate.player1Score = 0;
    gameToCreate.player2Score = 0;
  }
  
  batch.set(gameRef, gameToCreate);
  
  // Create questions
  const questionData: Question[] = [];
  gameData.questions.forEach((question, index) => {
    const questionRef = db.collection('questions').doc();
    const questionToCreate: Question = {
      id: questionRef.id,
      gameId: gameRef.id,
      ...question,
      questionNumber: index + 1,
      isAnswered: false,
      createdAt: new Date()
    };
    
    batch.set(questionRef, questionToCreate);
    questionData.push(questionToCreate);
  });
  
  await batch.commit();
  
  return {
    game: gameToCreate,
    questions: questionData
  };
};

export const submitAnswer = async (answerData: {
  gameId: string;
  questionId: string;
  playerId: string;
  playerGuess: string;
  isCorrect: boolean;
  matchedPlayerName?: string;
  allPossibleAnswers: string[];
  gameMode: 'single' | 'multiplayer';
  turnNumber?: number;
}) => {
  const batch = db.batch();
  
  // Create answer
  const answerRef = db.collection('answers').doc();
  
  // Only include defined fields in the answer
  const answerToCreate: any = {
    id: answerRef.id,
    gameId: answerData.gameId,
    questionId: answerData.questionId,
    playerId: answerData.playerId,
    playerGuess: answerData.playerGuess,
    isCorrect: answerData.isCorrect,
    allPossibleAnswers: answerData.allPossibleAnswers,
    gameMode: answerData.gameMode,
    timestamp: new Date()
  };

  // Only add optional fields if they're defined
  if (answerData.matchedPlayerName) {
    answerToCreate.matchedPlayerName = answerData.matchedPlayerName;
  }
  if (answerData.turnNumber !== undefined) {
    answerToCreate.turnNumber = answerData.turnNumber;
  }
  
  batch.set(answerRef, answerToCreate);
  
  // Update question as answered
  const questionRef = db.collection('questions').doc(answerData.questionId);
  batch.update(questionRef, {
    isAnswered: true,
    answeredBy: answerData.playerId
  });
  
  // Update game statistics
  const gameRef = db.collection('games').doc(answerData.gameId);
  const gameDoc = await gameRef.get();
  
  if (gameDoc.exists) {
    const gameData = gameDoc.data() as Game;
    
    if (gameData.gameMode === 'single') {
      // Single player logic
      const updatedGame: any = {
        answeredQuestions: gameData.answeredQuestions + 1,
        correctAnswers: gameData.correctAnswers + (answerData.isCorrect ? 1 : 0),
        score: gameData.correctAnswers + (answerData.isCorrect ? 1 : 0),
        updatedAt: new Date()
      };

      // Check if game is complete
      if ((gameData.answeredQuestions + 1) >= gameData.totalQuestions) {
        updatedGame.status = 'completed';
        updatedGame.endTime = new Date();
      }
      
      batch.update(gameRef, updatedGame);
    } else {
      // Multiplayer logic
      const isPlayer1 = answerData.playerId === gameData.player1Id;
      const updatedGame: any = {
        answeredQuestions: gameData.answeredQuestions + 1,
        correctAnswers: gameData.correctAnswers + (answerData.isCorrect ? 1 : 0),
        updatedAt: new Date()
      };
      
      // Update individual player scores
      if (answerData.isCorrect) {
        if (isPlayer1) {
          updatedGame.player1Score = (gameData.player1Score || 0) + 1;
        } else {
          updatedGame.player2Score = (gameData.player2Score || 0) + 1;
        }
      }
      
      // Switch turn (for multiplayer)
      updatedGame.currentTurn = isPlayer1 ? gameData.player2Id : gameData.player1Id;
      
      // Check if game is complete
      if ((gameData.answeredQuestions + 1) >= gameData.totalQuestions) {
        updatedGame.status = 'completed';
        updatedGame.endTime = new Date();
        
        // Determine winner
        const finalPlayer1Score = updatedGame.player1Score || gameData.player1Score || 0;
        const finalPlayer2Score = updatedGame.player2Score || gameData.player2Score || 0;
        updatedGame.score = Math.max(finalPlayer1Score, finalPlayer2Score);
      }
      
      batch.update(gameRef, updatedGame);
    }
  }
  
  // Update player statistics
  await updatePlayerStats(answerData.playerId, answerData.isCorrect, answerData.gameMode, batch);
  
  await batch.commit();
  
  return answerToCreate;
};

const updatePlayerStats = async (playerId: string, isCorrect: boolean, gameMode: 'single' | 'multiplayer', batch: FirebaseFirestore.WriteBatch) => {
  const playerRef = db.collection('players').doc(playerId);
  const playerDoc = await playerRef.get();
  
  if (playerDoc.exists) {
    const playerData = playerDoc.data() as Player;
    const updates: any = {
      totalGuesses: (playerData.totalGuesses || 0) + 1,
      correctGuesses: (playerData.correctGuesses || 0) + (isCorrect ? 1 : 0),
      updatedAt: new Date()
    };
    
    if (gameMode === 'single') {
      updates.singlePlayerGames = (playerData.singlePlayerGames || 0) + 1;
    } else {
      updates.multiplayerGames = (playerData.multiplayerGames || 0) + 1;
    }
    
    batch.update(playerRef, updates);
  } else {
    // Create new player - only include defined fields
    const newPlayer: any = {
      id: playerId,
      sessionCount: 1,
      totalGuesses: 1,
      correctGuesses: isCorrect ? 1 : 0,
      singlePlayerGames: gameMode === 'single' ? 1 : 0,
      multiplayerGames: gameMode === 'multiplayer' ? 1 : 0,
      singlePlayerWins: 0,
      multiplayerWins: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    batch.set(playerRef, newPlayer);
  }
};

export const getGame = async (gameId: string) => {
  const gameRef = db.collection('games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new Error('Game not found');
  }
  
  return { id: gameDoc.id, ...gameDoc.data() } as Game;
};

export const updateGame = async (gameId: string, gameData: any) => {
  const gameRef = db.collection('games').doc(gameId);
  const updateData = {
    ...gameData,
    updatedAt: new Date()
  };
  
  await gameRef.update(updateData);
  return { id: gameId, ...updateData };
};

export const deleteGame = async (gameId: string) => {
  const gameRef = db.collection('games').doc(gameId);
  await gameRef.delete();
  return { id: gameId };
};

export const getGameWithDetails = async (gameId: string) => {
  const gameDoc = await db.collection('games').doc(gameId).get();
  if (!gameDoc.exists) {
    throw new Error('Game not found');
  }
  
  // Get questions
  const questionsSnapshot = await db.collection('questions')
    .where('gameId', '==', gameId)
    .orderBy('questionNumber')
    .get();
  
  // Get answers
  const answersSnapshot = await db.collection('answers')
    .where('gameId', '==', gameId)
    .orderBy('timestamp')
    .get();
  
  return {
    game: { id: gameDoc.id, ...gameDoc.data() } as Game,
    questions: questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)),
    answers: answersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Answer))
  };
};

export const endGame = async (gameId: string, winnerId?: string) => {
  const updates: any = {
    status: 'completed',
    endTime: new Date(),
    updatedAt: new Date()
  };
  
  if (winnerId) {
    // Update winner's stats
    const playerRef = db.collection('players').doc(winnerId);
    const playerDoc = await playerRef.get();
    
    if (playerDoc.exists) {
      const gameDoc = await db.collection('games').doc(gameId).get();
      const gameData = gameDoc.data() as Game;
      
      const playerData = playerDoc.data() as Player;
      const playerUpdates: any = {
        updatedAt: new Date()
      };
      
      if (gameData.gameMode === 'single') {
        playerUpdates.singlePlayerWins = (playerData.singlePlayerWins || 0) + 1;
      } else {
        playerUpdates.multiplayerWins = (playerData.multiplayerWins || 0) + 1;
      }
      
      await playerRef.update(playerUpdates);
    }
  }
  
  await db.collection('games').doc(gameId).update(updates);
};

export const gameService = {
  createGame,
  submitAnswer,
  getGame,
  updateGame,
  deleteGame,
  getGameWithDetails,
  endGame
};