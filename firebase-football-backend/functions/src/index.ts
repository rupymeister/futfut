import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { gameService } from './services/gameService';
import * as gameController from './controllers/games';
import * as analyticsController from './controllers/analytics';

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
  } else {
    console.log('🔧 Initializing Firebase Admin for production mode');
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'futfut-6a19f'
    });
  }
}

export const db = admin.firestore();

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
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
    } else {
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
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());

// Add logging middleware to debug CORS
app.use((req: Request, res: Response, next: any) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
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
app.get('/test', async (req: Request, res: Response) => {
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
        analytics: '/analytics/track'
      }
    });
  } catch (error) {
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
app.get('/', (req: Request, res: Response) => {
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
// Replace this line:
// app.post('/games', gameController.createGame);

// With this inline implementation:
app.post('/games', async (req: Request, res: Response) => {
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

    // Use your existing gameService
    const gameData = await gameService.createGame({
      playerId,
      sessionId,
      gameMode,
      player2Id,
      questions: questions.map((q: any) => ({
        questionNumber: q.questionNumber,
        rowFeature: q.rowFeature,
        rowFeatureType: q.rowFeatureType,
        colFeature: q.colFeature,
        colFeatureType: q.colFeatureType,
        correctAnswers: q.correctAnswers,
        cellPosition: q.cellPosition
      }))
    });

    console.log('✅ Game created successfully:', gameData.game.id);

    return res.status(201).json({
      success: true,
      data: gameData
    });

  } catch (error) {
    console.error('❌ Error creating game:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Replace these lines:
// app.get('/games/:id', gameController.getGame);
// app.put('/games/:id', gameController.updateGame);
// app.delete('/games/:id', gameController.deleteGame);
// app.post('/games/:gameId/answers', gameController.submitAnswer);
// app.post('/games/:gameId/end', gameController.endGame);

// With these inline implementations:
app.get('/games/:id', async (req: Request, res: Response) => {
  try {
    const game = await gameService.getGame(req.params.id);
    res.status(200).json({ success: true, data: game });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/games/:gameId/answers', async (req: Request, res: Response) => {
  try {
    const answer = await gameService.submitAnswer({
      gameId: req.params.gameId,
      ...req.body
    });
    res.status(200).json({ success: true, data: answer });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answer',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/games/:gameId/end', async (req: Request, res: Response) => {
  try {
    const { winnerId } = req.body;
    await gameService.endGame(req.params.gameId, winnerId);
    res.status(200).json({ success: true, message: 'Game ended successfully' });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.put('/games/:id', async (req: Request, res: Response) => {
  try {
    const game = await gameService.updateGame(req.params.id, req.body);
    res.status(200).json({ success: true, data: game });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/games/:id', async (req: Request, res: Response) => {
  try {
    const result = await gameService.deleteGame(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


app.post('/games/validate', (req: Request, res: Response): void => {
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
      const answerCount = question.correctAnswers?.length || 0;
      const validAnswers = question.correctAnswers?.filter((answer: string) => 
        answer && answer.trim().length > 0
      ) || [];
      const uniqueAnswers = new Set(validAnswers.map((answer: string) => answer.toLowerCase().trim()));

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

  } catch (error) {
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
export const api = functions.region('us-central1').https.onRequest(app);