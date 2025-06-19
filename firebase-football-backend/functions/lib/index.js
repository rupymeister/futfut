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
// Initialize Firebase Admin with proper configuration
if (!admin.apps.length) {
    // Check if we're in emulator mode
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log('🔧 Initializing Firebase Admin for emulator mode');
        admin.initializeApp({
            projectId: 'futfut-6a19f'
        });
        // Connect to Firestore emulator
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
// Enable CORS for all routes
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
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
// Test route with database connection test
app.get('/test', async (req, res) => {
    console.log('Test endpoint called');
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    try {
        // Test Firestore connection
        console.log('Testing Firestore connection...');
        const testCollection = exports.db.collection('test');
        const testDoc = await testCollection.add({
            message: 'Connection test',
            timestamp: new Date(),
            mode: isEmulator ? 'emulator' : 'production'
        });
        console.log('Test document created with ID:', testDoc.id);
        // Read the document back to verify
        const docSnapshot = await testDoc.get();
        console.log('Test document data:', docSnapshot.data());
        // Clean up test document
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
// Root route for testing
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
// Analytics routes
app.post('/analytics/track', analyticsController.trackEvent);
app.get('/analytics', analyticsController.getAnalyticsData);
app.get('/analytics/games', analyticsController.getGameAnalytics);
// Export the Express app as a single Cloud Function
exports.api = functions.region('us-central1').https.onRequest(app);
//# sourceMappingURL=index.js.map