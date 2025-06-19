import { Request, Response } from 'express';
import { gameService } from '../services/gameService';

export const createGame = async (req: Request, res: Response): Promise<void> => {
    try {
        const { playerId, sessionId, gameMode, player2Id, questions } = req.body;
        
        if (!['single', 'multiplayer'].includes(gameMode)) {
            res.status(400).json({
                success: false,
                error: 'Invalid game mode. Must be "single" or "multiplayer"'
            });
            return;
        }
        
        if (gameMode === 'multiplayer' && !player2Id) {
            res.status(400).json({
                success: false,
                error: 'player2Id is required for multiplayer games'
            });
            return;
        }
        
        const result = await gameService.createGame({
            playerId,
            sessionId,
            gameMode,
            player2Id,
            questions
        });
        
        res.status(201).json({
            success: true,
            message: `${gameMode} game created successfully`,
            data: result
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

export const getGame = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const game = await gameService.getGameWithDetails(id);
        res.status(200).json({
            success: true,
            data: game
        });
    } catch (error) {
        console.error('Error getting game:', error);
        if (error instanceof Error && error.message === 'Game not found') {
            res.status(404).json({ 
                success: false,
                error: 'Game not found' 
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to get game',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};

export const updateGame = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const gameData = req.body;
        const result = await gameService.updateGame(id, gameData);
        res.status(200).json({
            success: true,
            message: 'Game updated successfully',
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
        const { id } = req.params;
        await gameService.deleteGame(id);
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
        const { gameId } = req.params;
        const { questionId, playerId, playerGuess, isCorrect, matchedPlayerName, allPossibleAnswers, gameMode, turnNumber } = req.body;
        
        const result = await gameService.submitAnswer({
            gameId,
            questionId,
            playerId,
            playerGuess,
            isCorrect,
            matchedPlayerName,
            allPossibleAnswers,
            gameMode,
            turnNumber
        });
        
        res.status(201).json({
            success: true,
            message: 'Answer submitted successfully',
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
        const { gameId } = req.params;
        const { winnerId } = req.body;
        
        await gameService.endGame(gameId, winnerId);
        
        res.status(200).json({
            success: true,
            message: 'Game ended successfully'
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