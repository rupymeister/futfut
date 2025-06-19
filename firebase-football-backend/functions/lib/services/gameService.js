"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameService = exports.endGame = exports.getGameWithDetails = exports.deleteGame = exports.updateGame = exports.getGame = exports.submitAnswer = exports.createGame = void 0;
const index_1 = require("../index");
const createGame = async (gameData) => {
    const batch = index_1.db.batch();
    // Create game
    const gameRef = index_1.db.collection('games').doc();
    // Base game data that's always included
    const baseGameData = {
        id: gameRef.id,
        playerId: gameData.playerId,
        sessionId: gameData.sessionId,
        gameMode: gameData.gameMode,
        startTime: new Date(),
        status: 'active',
        totalQuestions: gameData.questions.length,
        answeredQuestions: 0,
        correctAnswers: 0,
        score: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    // Only add multiplayer fields if it's a multiplayer game
    const gameToCreate = Object.assign({}, baseGameData);
    if (gameData.gameMode === 'multiplayer') {
        gameToCreate.player1Id = gameData.playerId;
        gameToCreate.player2Id = gameData.player2Id;
        gameToCreate.currentTurn = gameData.playerId;
        gameToCreate.player1Score = 0;
        gameToCreate.player2Score = 0;
    }
    batch.set(gameRef, gameToCreate);
    // Create questions
    const questionData = [];
    gameData.questions.forEach((question, index) => {
        const questionRef = index_1.db.collection('questions').doc();
        const questionToCreate = Object.assign(Object.assign({ id: questionRef.id, gameId: gameRef.id }, question), { questionNumber: index + 1, isAnswered: false, createdAt: new Date() });
        batch.set(questionRef, questionToCreate);
        questionData.push(questionToCreate);
    });
    await batch.commit();
    return {
        game: gameToCreate,
        questions: questionData
    };
};
exports.createGame = createGame;
const submitAnswer = async (answerData) => {
    const batch = index_1.db.batch();
    // Create answer
    const answerRef = index_1.db.collection('answers').doc();
    // Only include defined fields in the answer
    const answerToCreate = {
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
    const questionRef = index_1.db.collection('questions').doc(answerData.questionId);
    batch.update(questionRef, {
        isAnswered: true,
        answeredBy: answerData.playerId
    });
    // Update game statistics
    const gameRef = index_1.db.collection('games').doc(answerData.gameId);
    const gameDoc = await gameRef.get();
    if (gameDoc.exists) {
        const gameData = gameDoc.data();
        if (gameData.gameMode === 'single') {
            // Single player logic
            const updatedGame = {
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
        }
        else {
            // Multiplayer logic
            const isPlayer1 = answerData.playerId === gameData.player1Id;
            const updatedGame = {
                answeredQuestions: gameData.answeredQuestions + 1,
                correctAnswers: gameData.correctAnswers + (answerData.isCorrect ? 1 : 0),
                updatedAt: new Date()
            };
            // Update individual player scores
            if (answerData.isCorrect) {
                if (isPlayer1) {
                    updatedGame.player1Score = (gameData.player1Score || 0) + 1;
                }
                else {
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
exports.submitAnswer = submitAnswer;
const updatePlayerStats = async (playerId, isCorrect, gameMode, batch) => {
    const playerRef = index_1.db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();
    if (playerDoc.exists) {
        const playerData = playerDoc.data();
        const updates = {
            totalGuesses: (playerData.totalGuesses || 0) + 1,
            correctGuesses: (playerData.correctGuesses || 0) + (isCorrect ? 1 : 0),
            updatedAt: new Date()
        };
        if (gameMode === 'single') {
            updates.singlePlayerGames = (playerData.singlePlayerGames || 0) + 1;
        }
        else {
            updates.multiplayerGames = (playerData.multiplayerGames || 0) + 1;
        }
        batch.update(playerRef, updates);
    }
    else {
        // Create new player - only include defined fields
        const newPlayer = {
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
const getGame = async (gameId) => {
    const gameRef = index_1.db.collection('games').doc(gameId);
    const gameDoc = await gameRef.get();
    if (!gameDoc.exists) {
        throw new Error('Game not found');
    }
    return Object.assign({ id: gameDoc.id }, gameDoc.data());
};
exports.getGame = getGame;
const updateGame = async (gameId, gameData) => {
    const gameRef = index_1.db.collection('games').doc(gameId);
    const updateData = Object.assign(Object.assign({}, gameData), { updatedAt: new Date() });
    await gameRef.update(updateData);
    return Object.assign({ id: gameId }, updateData);
};
exports.updateGame = updateGame;
const deleteGame = async (gameId) => {
    const gameRef = index_1.db.collection('games').doc(gameId);
    await gameRef.delete();
    return { id: gameId };
};
exports.deleteGame = deleteGame;
const getGameWithDetails = async (gameId) => {
    const gameDoc = await index_1.db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
        throw new Error('Game not found');
    }
    // Get questions
    const questionsSnapshot = await index_1.db.collection('questions')
        .where('gameId', '==', gameId)
        .orderBy('questionNumber')
        .get();
    // Get answers
    const answersSnapshot = await index_1.db.collection('answers')
        .where('gameId', '==', gameId)
        .orderBy('timestamp')
        .get();
    return {
        game: Object.assign({ id: gameDoc.id }, gameDoc.data()),
        questions: questionsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data()))),
        answers: answersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())))
    };
};
exports.getGameWithDetails = getGameWithDetails;
const endGame = async (gameId, winnerId) => {
    const updates = {
        status: 'completed',
        endTime: new Date(),
        updatedAt: new Date()
    };
    if (winnerId) {
        // Update winner's stats
        const playerRef = index_1.db.collection('players').doc(winnerId);
        const playerDoc = await playerRef.get();
        if (playerDoc.exists) {
            const gameDoc = await index_1.db.collection('games').doc(gameId).get();
            const gameData = gameDoc.data();
            const playerData = playerDoc.data();
            const playerUpdates = {
                updatedAt: new Date()
            };
            if (gameData.gameMode === 'single') {
                playerUpdates.singlePlayerWins = (playerData.singlePlayerWins || 0) + 1;
            }
            else {
                playerUpdates.multiplayerWins = (playerData.multiplayerWins || 0) + 1;
            }
            await playerRef.update(playerUpdates);
        }
    }
    await index_1.db.collection('games').doc(gameId).update(updates);
};
exports.endGame = endGame;
exports.gameService = {
    createGame: exports.createGame,
    submitAnswer: exports.submitAnswer,
    getGame: exports.getGame,
    updateGame: exports.updateGame,
    deleteGame: exports.deleteGame,
    getGameWithDetails: exports.getGameWithDetails,
    endGame: exports.endGame
};
//# sourceMappingURL=gameService.js.map