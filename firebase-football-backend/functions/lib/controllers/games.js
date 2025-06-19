"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endGame = exports.submitAnswer = exports.deleteGame = exports.updateGame = exports.getGame = exports.createGame = void 0;
const gameService_1 = require("../services/gameService");
const createGame = async (req, res) => {
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
        const result = await gameService_1.gameService.createGame({
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
    }
    catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createGame = createGame;
const getGame = async (req, res) => {
    try {
        const { id } = req.params;
        const game = await gameService_1.gameService.getGameWithDetails(id);
        res.status(200).json({
            success: true,
            data: game
        });
    }
    catch (error) {
        console.error('Error getting game:', error);
        if (error instanceof Error && error.message === 'Game not found') {
            res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to get game',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.getGame = getGame;
const updateGame = async (req, res) => {
    try {
        const { id } = req.params;
        const gameData = req.body;
        const result = await gameService_1.gameService.updateGame(id, gameData);
        res.status(200).json({
            success: true,
            message: 'Game updated successfully',
            data: result
        });
    }
    catch (error) {
        console.error('Error updating game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateGame = updateGame;
const deleteGame = async (req, res) => {
    try {
        const { id } = req.params;
        await gameService_1.gameService.deleteGame(id);
        res.status(200).json({
            success: true,
            message: 'Game deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteGame = deleteGame;
const submitAnswer = async (req, res) => {
    try {
        const { gameId } = req.params;
        const { questionId, playerId, playerGuess, isCorrect, matchedPlayerName, allPossibleAnswers, gameMode, turnNumber } = req.body;
        const result = await gameService_1.gameService.submitAnswer({
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
    }
    catch (error) {
        console.error('Error submitting answer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit answer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.submitAnswer = submitAnswer;
const endGame = async (req, res) => {
    try {
        const { gameId } = req.params;
        const { winnerId } = req.body;
        await gameService_1.gameService.endGame(gameId, winnerId);
        res.status(200).json({
            success: true,
            message: 'Game ended successfully'
        });
    }
    catch (error) {
        console.error('Error ending game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.endGame = endGame;
//# sourceMappingURL=games.js.map