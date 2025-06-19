"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.endGame = exports.submitAnswer = exports.deleteGame = exports.updateGame = exports.getGame = exports.createGame = void 0;
const gameService = __importStar(require("../services/gameService"));
// Validation function to ensure all questions have at least 10 possible answers
const validateMinimumAnswers = (questions) => {
    const errors = [];
    const MINIMUM_ANSWERS_REQUIRED = 10;
    questions.forEach((question) => {
        var _a, _b;
        const answerCount = ((_a = question.correctAnswers) === null || _a === void 0 ? void 0 : _a.length) || 0;
        if (answerCount < MINIMUM_ANSWERS_REQUIRED) {
            errors.push(`Question ${question.questionNumber} (${question.rowFeature} × ${question.colFeature}) ` +
                `has only ${answerCount} possible answers. At least ${MINIMUM_ANSWERS_REQUIRED} required.`);
        }
        // Additional validation: check for empty/invalid answers
        const validAnswers = ((_b = question.correctAnswers) === null || _b === void 0 ? void 0 : _b.filter(answer => answer && answer.trim().length > 0)) || [];
        if (validAnswers.length !== answerCount) {
            errors.push(`Question ${question.questionNumber} contains ${answerCount - validAnswers.length} empty or invalid answers`);
        }
        // Check for duplicate answers (case-insensitive)
        const uniqueAnswers = new Set(validAnswers.map(answer => answer.toLowerCase().trim()));
        if (uniqueAnswers.size !== validAnswers.length) {
            errors.push(`Question ${question.questionNumber} contains duplicate answers (${validAnswers.length - uniqueAnswers.size} duplicates found)`);
        }
    });
    return {
        isValid: errors.length === 0,
        errors
    };
};
const createGame = async (req, res) => {
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
        // Validate that all questions have at least 10 possible answers
        const validation = validateMinimumAnswers(questions);
        if (!validation.isValid) {
            console.warn('Game creation rejected due to insufficient answers:', validation.errors);
            res.status(400).json({
                success: false,
                error: 'Cannot create game: Some questions do not have enough possible answers',
                details: {
                    requirement: 'Each question must have at least 10 different possible correct answers',
                    minimumRequired: 10,
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
        console.log(`✅ All ${questions.length} questions passed validation (minimum 10 answers each)`);
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
                minimumAnswersRequired: 10,
                questionsValidated: questions.length
            }
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
// Add explicit return types to other exported functions
const getGame = async (req, res) => {
    try {
        const gameId = req.params.id;
        const result = await gameService.getGame(gameId);
        res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error getting game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getGame = getGame;
const updateGame = async (req, res) => {
    try {
        const gameId = req.params.id;
        const updateData = req.body;
        const result = await gameService.updateGame(gameId, updateData);
        res.status(200).json({
            success: true,
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
        const gameId = req.params.id;
        await gameService.deleteGame(gameId);
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
        const gameId = req.params.gameId;
        const answerData = req.body;
        const result = await gameService.submitAnswer(Object.assign({ gameId }, answerData));
        res.status(200).json({
            success: true,
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
        const gameId = req.params.gameId;
        const { winnerId } = req.body;
        const result = await gameService.endGame(gameId, winnerId);
        res.status(200).json({
            success: true,
            data: result
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