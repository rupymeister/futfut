import { Request, Response } from 'express';
import * as gameService from '../services/gameService';

interface Question {
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

// Validation function to ensure all questions have at least 10 possible answers
const validateMinimumAnswers = (questions: Question[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const MINIMUM_ANSWERS_REQUIRED = 3;

  questions.forEach((question) => {
    const answerCount = question.correctAnswers?.length || 0;
    
    if (answerCount < MINIMUM_ANSWERS_REQUIRED) {
      errors.push(
        `Question ${question.questionNumber} (${question.rowFeature} × ${question.colFeature}) ` +
        `has only ${answerCount} possible answers. At least ${MINIMUM_ANSWERS_REQUIRED} required.`
      );
    }

    // Additional validation: check for empty/invalid answers
    const validAnswers = question.correctAnswers?.filter(answer => 
      answer && answer.trim().length > 0
    ) || [];
    
    if (validAnswers.length !== answerCount) {
      errors.push(
        `Question ${question.questionNumber} contains ${answerCount - validAnswers.length} empty or invalid answers`
      );
    }

    // Check for duplicate answers (case-insensitive)
    const uniqueAnswers = new Set(validAnswers.map(answer => answer.toLowerCase().trim()));
    if (uniqueAnswers.size !== validAnswers.length) {
      errors.push(
        `Question ${question.questionNumber} contains duplicate answers (${validAnswers.length - uniqueAnswers.size} duplicates found)`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const createGame = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Creating game with data:', req.body);
    
    const { playerId, sessionId, gameMode, player2Id, questions } = req.body;

    // Validate required fields
    if (!playerId || !sessionId || !gameMode || !questions) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: playerId, sessionId, gameMode, and questions are required'
      });
      return;
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Questions must be a non-empty array'
      });
      return;
    }

    // Validate that all questions have at least 3 possible answers
    const validation = validateMinimumAnswers(questions);
    if (!validation.isValid) {
      console.warn('Game creation rejected due to insufficient answers:', validation.errors);
      
      res.status(400).json({
        success: false,
        error: 'Cannot create game: Some questions do not have enough possible answers',
        details: {
          requirement: 'Each question must have at least 3 different possible correct answers',
          minimumRequired: 3,
          validationErrors: validation.errors,
          totalQuestions: questions.length,
          failedQuestions: validation.errors.length
        },
        message: 'Please regenerate the game with questions that have more possible answers'
      });
      return;
    }

    // Validate multiplayer mode requirements
    if (gameMode === 'multiplayer' && !player2Id) {
      res.status(400).json({
        success: false,
        error: 'player2Id is required for multiplayer games'
      });
      return;
    }

    // Log successful validation
    console.log(`✅ All ${questions.length} questions passed validation (minimum 3 answers each)`);

    // Create the game
    const result = await gameService.createGame({
      playerId,
      sessionId,
      gameMode,
      player2Id,
      questions
    });

    console.log('Game created successfully:', result.game.id);
    
    res.status(201).json({
      success: true,
      data: result,
      message: `${gameMode} game created successfully with ${questions.length} validated questions`,
      validation: {
        passed: true,
        minimumAnswersRequired: 3,
        questionsValidated: questions.length
      }
    });

  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add explicit return types to other exported functions
export const getGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = req.params.id;
    const result = await gameService.getGame(gameId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = req.params.id;
    const updateData = req.body;
    
    const result = await gameService.updateGame(gameId, updateData);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = req.params.id;
    await gameService.deleteGame(gameId);
    
    res.status(200).json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const submitAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = req.params.gameId;
    const answerData = req.body;
    
    const result = await gameService.submitAnswer({ gameId, ...answerData });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answer',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const endGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const gameId = req.params.gameId;
    const { winnerId } = req.body;
    
    const result = await gameService.endGame(gameId, winnerId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};