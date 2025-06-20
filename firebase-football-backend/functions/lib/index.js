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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.db = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
// Initialize Firebase Admin
if (!admin.apps.length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log('🔧 Initializing Firebase Admin for emulator mode');
        admin.initializeApp({
            projectId: 'futfut-6a19f'
        });
    }
    else {
        console.log('🔧 Initializing Firebase Admin for production mode');
        admin.initializeApp();
    }
}
// Initialize Firestore
const db = admin.firestore();
exports.db = db;
// Only set emulator settings if in emulator mode
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('🔧 Setting Firestore emulator settings');
    db.settings({
        host: 'localhost:8080',
        ssl: false
    });
}
const app = (0, express_1.default)();
// Enhanced CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4173',
            'https://futfut.vercel.app',
            'https://futfut-git-main-anilaltuncus-projects.vercel.app'
        ];
        // Check if origin is in allowed list or matches Vercel pattern
        if (allowedOrigins.includes(origin) ||
            /^https:\/\/futfut.*\.vercel\.app$/.test(origin) ||
            /^https:\/\/.*\.vercel\.app$/.test(origin)) {
            callback(null, true);
        }
        else {
            console.warn('CORS blocked origin:', origin);
            callback(null, true); // Allow all origins for now to debug
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control'
    ],
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Add logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: err.message
    });
});
// Basic health check route
app.get('/health', async (req, res) => {
    console.log('Health endpoint called');
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    let firestoreStatus = 'Unknown';
    let firestoreError = null;
    try {
        await db.collection('_health').limit(1).get();
        firestoreStatus = 'Connected';
        console.log('✅ Firestore connection successful');
    }
    catch (error) {
        firestoreStatus = 'Failed';
        firestoreError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Firestore connection failed:', error);
    }
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        project: process.env.GCLOUD_PROJECT || 'futfut-6a19f',
        mode: isEmulator ? 'emulator' : 'production',
        firestoreStatus,
        firestoreError,
        message: `Firebase Functions is working in ${isEmulator ? 'emulator' : 'production'} mode!`
    });
});
// Test route
app.get('/test', async (req, res) => {
    console.log('Test endpoint called');
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    try {
        console.log('Testing Firestore connection...');
        const testCollection = db.collection('test');
        const testDoc = await testCollection.add({
            message: 'Connection test',
            timestamp: new Date(),
            mode: isEmulator ? 'emulator' : 'production'
        });
        console.log('Test document created with ID:', testDoc.id);
        const docSnapshot = await testDoc.get();
        console.log('Test document data:', docSnapshot.data());
        await testDoc.delete();
        console.log('Test document deleted');
        res.status(200).json({
            message: 'Firebase Functions Backend is working!',
            project: process.env.GCLOUD_PROJECT || 'futfut-6a19f',
            timestamp: new Date().toISOString(),
            mode: isEmulator ? 'emulator' : 'production',
            firestoreStatus: 'Connected',
            firestoreHost: isEmulator ? 'localhost:8080' : 'production',
            availableEndpoints: {
                health: '/health',
                test: '/test',
                games: '/games',
                'validate-questions': '/games/validate',
                'submit-answer': '/games/:gameId/answers',
                analytics: '/analytics/track'
            }
        });
    }
    catch (error) {
        console.error('Firestore connection test failed:', error);
        res.status(500).json({
            message: 'Firebase Functions Backend is running but Firestore connection failed',
            project: process.env.GCLOUD_PROJECT || 'futfut-6a19f',
            timestamp: new Date().toISOString(),
            mode: isEmulator ? 'emulator' : 'production',
            firestoreStatus: 'Connection Failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : 'No stack trace'
        });
    }
});
// Root route
app.get('/', (req, res) => {
    console.log('Root endpoint called');
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    res.status(200).json({
        message: 'Firebase Functions API is running',
        project: process.env.GCLOUD_PROJECT || 'futfut-6a19f',
        mode: isEmulator ? 'emulator' : 'production',
        endpoints: ['/health', '/test', '/games', '/games/validate', '/analytics']
    });
});
// Validation endpoint - MUST come before dynamic routes
app.post('/games/validate', (req, res) => {
    try {
        console.log('Validation endpoint called with:', req.body);
        const { questions } = req.body;
        if (!Array.isArray(questions)) {
            res.status(400).json({
                success: false,
                error: 'Questions must be an array'
            });
            return;
        }
        const MINIMUM_ANSWERS_REQUIRED = 3;
        const results = questions.map((question, index) => {
            var _a, _b;
            const answerCount = ((_a = question.correctAnswers) === null || _a === void 0 ? void 0 : _a.length) || 0;
            const validAnswers = ((_b = question.correctAnswers) === null || _b === void 0 ? void 0 : _b.filter((answer) => answer && answer.trim().length > 0)) || [];
            const uniqueAnswers = new Set(validAnswers.map((answer) => answer.toLowerCase().trim()));
            return {
                questionNumber: question.questionNumber || index + 1,
                rowFeature: question.rowFeature,
                colFeature: question.colFeature,
                totalAnswers: answerCount,
                validAnswers: validAnswers.length,
                uniqueAnswers: uniqueAnswers.size,
                meetsMinimum: uniqueAnswers.size >= MINIMUM_ANSWERS_REQUIRED,
                issues: [
                    ...(answerCount < MINIMUM_ANSWERS_REQUIRED ? [`Only ${answerCount} answers (need ${MINIMUM_ANSWERS_REQUIRED})`] : []),
                    ...(validAnswers.length !== answerCount ? [`${answerCount - validAnswers.length} empty answers`] : []),
                    ...(uniqueAnswers.size !== validAnswers.length ? [`${validAnswers.length - uniqueAnswers.size} duplicate answers`] : [])
                ]
            };
        });
        const validQuestions = results.filter(r => r.meetsMinimum);
        const invalidQuestions = results.filter(r => !r.meetsMinimum);
        console.log('Validation completed:', { validQuestions: validQuestions.length, invalidQuestions: invalidQuestions.length });
        res.json({
            success: true,
            isValid: invalidQuestions.length === 0,
            summary: {
                totalQuestions: questions.length,
                validQuestions: validQuestions.length,
                invalidQuestions: invalidQuestions.length,
                canCreateGame: invalidQuestions.length === 0,
                minimumRequired: MINIMUM_ANSWERS_REQUIRED
            },
            details: results,
            message: invalidQuestions.length === 0
                ? 'All questions meet the minimum answer requirement'
                : `${invalidQuestions.length} questions need more answers`
        });
    }
    catch (error) {
        console.error('Error validating questions:', error);
        res.status(500).json({
            success: false,
            isValid: false,
            error: 'Failed to validate questions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Game creation endpoint
app.post('/games', async (req, res) => {
    try {
        console.log('🎮 Creating game via inline handler:', req.body);
        const { playerId, sessionId, gameMode, questions, player2Id } = req.body;
        // Basic validation
        if (!playerId || !sessionId || !gameMode || !questions) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: playerId, sessionId, gameMode, questions'
            });
        }
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Questions must be a non-empty array'
            });
        }
        // Skip Firestore for now to avoid connection issues
        console.log('Creating game without Firestore persistence...');
        const gameId = `${gameMode}_${sessionId}_${Date.now()}`;
        // Process questions for frontend
        const processedQuestions = questions.map((q, index) => ({
            id: `${gameId}_q${index + 1}`,
            gameId,
            questionNumber: q.questionNumber || index + 1,
            rowFeature: q.rowFeature,
            rowFeatureType: q.rowFeatureType,
            colFeature: q.colFeature,
            colFeatureType: q.colFeatureType,
            correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [],
            cellPosition: q.cellPosition || { row: index, col: 0 },
            isAnswered: false,
            createdAt: new Date().toISOString()
        }));
        const gameData = {
            id: gameId,
            playerId,
            sessionId,
            gameMode,
            player2Id: player2Id || null,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalQuestions: questions.length,
            answeredQuestions: 0
        };
        // Try to save to Firestore but don't fail if it doesn't work
        try {
            console.log('Attempting to save to Firestore...');
            await db.collection('games').doc(gameId).set(Object.assign(Object.assign({}, gameData), { questions: questions.map((q) => ({
                    questionNumber: q.questionNumber,
                    rowFeature: q.rowFeature,
                    rowFeatureType: q.rowFeatureType,
                    colFeature: q.colFeature,
                    colFeatureType: q.colFeatureType,
                    correctAnswers: q.correctAnswers,
                    cellPosition: q.cellPosition
                })), createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
            console.log('✅ Game saved to Firestore');
        }
        catch (dbError) {
            console.warn('⚠️ Failed to save to Firestore, but continuing:', dbError);
        }
        console.log('✅ Game created successfully:', gameId);
        // Return data in the format your frontend expects
        return res.status(201).json({
            success: true,
            data: {
                game: gameData,
                questions: processedQuestions // Include questions array for frontend
            },
            message: `${gameMode} game created successfully with ${questions.length} questions`
        });
    }
    catch (error) {
        console.error('❌ Error creating game:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create game',
            details: error instanceof Error ? error.message : 'Unknown error',
            errorCode: (error === null || error === void 0 ? void 0 : error.code) || 'UNKNOWN'
        });
    }
});
// Update the answer submission endpoint to store the tracking data you want:
// Update the answer submission endpoint with better validation logic:
app.post('/games/:gameId/answers', async (req, res) => {
    var _a;
    try {
        console.log('🎯 Submitting answer for game:', req.params.gameId, req.body);
        const { gameId } = req.params;
        const { playerId, questionNumber, playerName, rowFeature, colFeature, isCorrect: frontendCorrect, matchedPlayerName: frontendMatchedPlayer } = req.body;
        // Basic validation
        if (!playerId || !questionNumber || !playerName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: playerId, questionNumber, playerName',
                receivedData: req.body
            });
        }
        console.log('Processing answer:', {
            gameId,
            playerId,
            questionNumber,
            playerName,
            rowFeature,
            colFeature,
            frontendCorrect,
            frontendMatchedPlayer
        });
        // Helper function to normalize text (same as frontend)
        const normalizeText = (text) => {
            return text
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9\s]/g, "")
                .replace(/\s+/g, " ")
                .trim();
        };
        // Advanced name matching function (same logic as frontend)
        const isNameMatch = (guess, candidateName) => {
            const normalizedGuess = normalizeText(guess);
            const normalizedName = normalizeText(candidateName);
            // Exact match
            if (normalizedName === normalizedGuess) {
                return true;
            }
            // Partial match
            if (normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName)) {
                return (normalizedGuess.length >= normalizedName.length * 0.6 ||
                    normalizedName.includes(normalizedGuess));
            }
            // Multi-word name matching
            const nameParts = normalizedName.split(" ");
            const guessParts = normalizedGuess.split(" ");
            if (nameParts.length >= 2 && guessParts.length >= 1) {
                const firstNameMatch = nameParts[0].startsWith(guessParts[0]) ||
                    (guessParts[0] && guessParts[0].startsWith(nameParts[0]));
                const lastNameMatch = guessParts.length > 1 &&
                    (nameParts[nameParts.length - 1].startsWith(guessParts[guessParts.length - 1]) ||
                        guessParts[guessParts.length - 1].startsWith(nameParts[nameParts.length - 1]));
                if (firstNameMatch && lastNameMatch) {
                    return true;
                }
                if (guessParts.length === 1 &&
                    (nameParts[nameParts.length - 1].startsWith(guessParts[0]) ||
                        guessParts[0].startsWith(nameParts[nameParts.length - 1]))) {
                    return normalizedGuess.length >= 3;
                }
            }
            return false;
        };
        // Try to get game from Firestore for backend validation
        let gameData = null;
        let question = null;
        let backendCorrect = false;
        let backendMatchedPlayer = null;
        try {
            const gameDoc = await db.collection('games').doc(gameId).get();
            if (gameDoc.exists) {
                gameData = gameDoc.data();
                question = (_a = gameData === null || gameData === void 0 ? void 0 : gameData.questions) === null || _a === void 0 ? void 0 : _a.find((q) => q.questionNumber === questionNumber);
                if (question && question.correctAnswers) {
                    // Use advanced matching logic
                    for (const correctAnswer of question.correctAnswers) {
                        if (isNameMatch(playerName, correctAnswer)) {
                            backendCorrect = true;
                            backendMatchedPlayer = correctAnswer;
                            break;
                        }
                    }
                }
            }
        }
        catch (dbError) {
            console.warn('Could not fetch game from Firestore:', dbError);
        }
        // Use frontend validation as fallback, but prefer backend if available
        const finalCorrect = question ? backendCorrect : (frontendCorrect !== null && frontendCorrect !== void 0 ? frontendCorrect : false);
        const finalMatchedPlayer = question ? backendMatchedPlayer : frontendMatchedPlayer;
        console.log('Validation results:', {
            frontendCorrect,
            backendCorrect: question ? backendCorrect : 'N/A',
            finalCorrect,
            frontendMatchedPlayer,
            backendMatchedPlayer: question ? backendMatchedPlayer : 'N/A',
            finalMatchedPlayer
        });
        // Create comprehensive answer record
        const answerData = {
            id: `${gameId}_answer_${Date.now()}`,
            gameId,
            playerId,
            questionNumber,
            // The guess and result
            guess: playerName,
            isCorrect: finalCorrect,
            matchedPlayerName: finalMatchedPlayer,
            // Question context
            rowFeature,
            colFeature,
            // Frontend vs Backend validation comparison
            frontendCorrect: frontendCorrect !== null && frontendCorrect !== void 0 ? frontendCorrect : null,
            backendCorrect: question ? backendCorrect : null,
            validationSource: question ? 'backend' : 'frontend',
            // Timestamps
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        // Save to database
        try {
            await db.collection('answers').add(Object.assign(Object.assign({}, answerData), { submittedAt: admin.firestore.FieldValue.serverTimestamp(), createdAt: admin.firestore.FieldValue.serverTimestamp() }));
            console.log('✅ Answer saved to Firestore');
        }
        catch (dbError) {
            console.warn('⚠️ Failed to save answer to Firestore:', dbError);
        }
        // Update game status
        if (gameData) {
            try {
                await db.collection('games').doc(gameId).update({
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastAnsweredAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            catch (updateError) {
                console.warn('Failed to update game:', updateError);
            }
        }
        console.log('✅ Answer processed successfully:', {
            id: answerData.id,
            guess: playerName,
            isCorrect: finalCorrect,
            matchedPlayer: finalMatchedPlayer
        });
        return res.status(201).json({
            success: true,
            data: {
                answer: {
                    id: answerData.id,
                    guess: playerName,
                    isCorrect: finalCorrect,
                    matchedPlayerName: finalMatchedPlayer,
                    questionNumber,
                    submittedAt: answerData.submittedAt
                },
                validation: {
                    isCorrect: finalCorrect,
                    matchedPlayer: finalMatchedPlayer,
                    source: answerData.validationSource,
                    details: {
                        frontendResult: frontendCorrect,
                        backendResult: question ? backendCorrect : 'No question data',
                        usedResult: finalCorrect
                    }
                }
            },
            message: finalCorrect
                ? `Correct! Matched player: ${finalMatchedPlayer}`
                : 'Incorrect answer, try again!'
        });
    }
    catch (error) {
        console.error('❌ Error submitting answer:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit answer',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get game endpoint
app.get('/games/:id', async (req, res) => {
    try {
        console.log('📖 Getting game:', req.params.id);
        const gameDoc = await db.collection('games').doc(req.params.id).get();
        if (!gameDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        const gameData = gameDoc.data();
        return res.status(200).json({
            success: true,
            data: {
                game: Object.assign(Object.assign({}, gameData), { id: gameDoc.id })
            }
        });
    }
    catch (error) {
        console.error('Error getting game:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update game endpoint
app.put('/games/:id', async (req, res) => {
    try {
        console.log('📝 Updating game:', req.params.id, req.body);
        const updates = Object.assign(Object.assign({}, req.body), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.collection('games').doc(req.params.id).update(updates);
        return res.status(200).json({
            success: true,
            message: 'Game updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating game:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Delete game endpoint
app.delete('/games/:id', async (req, res) => {
    try {
        console.log('🗑️ Deleting game:', req.params.id);
        await db.collection('games').doc(req.params.id).delete();
        return res.status(200).json({
            success: true,
            message: 'Game deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting game:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// End game endpoint
app.post('/games/:gameId/end', async (req, res) => {
    try {
        console.log('🏁 Ending game:', req.params.gameId, req.body);
        const { winnerId } = req.body;
        const { gameId } = req.params;
        const updates = {
            status: 'completed',
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (winnerId) {
            updates.winnerId = winnerId;
        }
        await db.collection('games').doc(gameId).update(updates);
        return res.status(200).json({
            success: true,
            message: 'Game ended successfully'
        });
    }
    catch (error) {
        console.error('Error ending game:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to end game',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Analytics endpoints
app.post('/analytics/track', async (req, res) => {
    try {
        console.log('📊 Tracking analytics event:', req.body);
        const eventData = Object.assign(Object.assign({}, req.body), { timestamp: admin.firestore.FieldValue.serverTimestamp(), createdAt: admin.firestore.FieldValue.serverTimestamp() });
        await db.collection('analytics').add(eventData);
        return res.status(201).json({
            success: true,
            message: 'Event tracked successfully'
        });
    }
    catch (error) {
        console.error('Error tracking analytics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to track event',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/analytics', async (req, res) => {
    try {
        const analytics = await db.collection('analytics').orderBy('timestamp', 'desc').limit(100).get();
        const events = analytics.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return res.status(200).json({
            success: true,
            data: { events }
        });
    }
    catch (error) {
        console.error('Error getting analytics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get analytics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/analytics/games', async (req, res) => {
    try {
        const games = await db.collection('games').orderBy('createdAt', 'desc').limit(50).get();
        const gameData = games.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return res.status(200).json({
            success: true,
            data: { games: gameData }
        });
    }
    catch (error) {
        console.error('Error getting game analytics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get game analytics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Export the Express app as a single Cloud Function
exports.api = functions.region('us-central1').https.onRequest(app);
//# sourceMappingURL=index.js.map