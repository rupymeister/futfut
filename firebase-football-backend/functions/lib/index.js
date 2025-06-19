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
const gameController = __importStar(require("./controllers/games"));
const analyticsController = __importStar(require("./controllers/analytics"));
// Initialize Firebase Admin
if (!admin.apps.length) {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log('🔧 Initializing Firebase Admin for emulator mode');
        admin.initializeApp({
            projectId: 'futfut-6a19f'
        });
        const db = admin.firestore();
        db.settings({
            host: 'localhost:8080',
            ssl: false
        });
    }
    else {
        console.log('🔧 Initializing Firebase Admin for production mode');
        admin.initializeApp({
            projectId: process.env.GCLOUD_PROJECT || 'futfut-6a19f'
        });
    }
}
exports.db = admin.firestore();
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
            callback(new Error('Not allowed by CORS'));
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
// Handle preflight requests explicitly
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Add logging middleware to debug CORS
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
app.get('/health', (req, res) => {
    console.log('Health endpoint called');
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        project: process.env.GCLOUD_PROJECT || 'futfut-6a19f',
        mode: isEmulator ? 'emulator' : 'production',
        message: `Firebase Functions is working in ${isEmulator ? 'emulator' : 'production'} mode!`
    });
});
// Test route
app.get('/test', async (req, res) => {
    console.log('Test endpoint called');
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    try {
        console.log('Testing Firestore connection...');
        const testCollection = exports.db.collection('test');
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
        endpoints: ['/health', '/test', '/games', '/analytics']
    });
});
// Game routes
app.post('/games', gameController.createGame);
app.get('/games/:id', gameController.getGame);
app.put('/games/:id', gameController.updateGame);
app.delete('/games/:id', gameController.deleteGame);
app.post('/games/:gameId/answers', gameController.submitAnswer);
app.post('/games/:gameId/end', gameController.endGame);
app.post('/games/validate', (req, res) => {
    // Remove these manual CORS headers - they conflict with global CORS
    // res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    // res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    // res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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
            error: 'Failed to validate questions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Analytics routes
app.post('/analytics/track', analyticsController.trackEvent);
app.get('/analytics', analyticsController.getAnalyticsData);
app.get('/analytics/games', analyticsController.getGameAnalytics);
// Export the Express app as a single Cloud Function
exports.api = functions.region('us-central1').https.onRequest(app);
//# sourceMappingURL=index.js.map