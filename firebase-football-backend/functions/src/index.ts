import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { gameService } from './services/gameService';
import * as gameController from './controllers/games';
import * as analyticsController from './controllers/analytics';

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
  } else {
    console.log('🔧 Initializing Firebase Admin for production mode');
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'futfut-6a19f'
    });
  }
}

export const db = admin.firestore();

const app = express();

// Enable CORS for all routes
// Find the CORS configuration and update it
app.use(cors({ 
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev
    'http://localhost:4173', // Vite preview
    'https://futfut.vercel.app', // Your main Vercel domain
    /https:\/\/futfut.*\.vercel\.app$/, // All Vercel preview deployments
    /\.vercel\.app$/ // Allow all vercel subdomains
  ],
  credentials: true
}));
app.use(express.json());

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

// Test route with database connection test
app.get('/test', async (req: Request, res: Response) => {
  console.log('Test endpoint called');
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  
  try {
    // Test Firestore connection
    console.log('Testing Firestore connection...');
    const testCollection = db.collection('test');
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

// Root route for testing
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
app.post('/games', gameController.createGame);

app.get('/games/:id', gameController.getGame);
app.put('/games/:id', gameController.updateGame);
app.delete('/games/:id', gameController.deleteGame);
app.post('/games/:gameId/answers', gameController.submitAnswer);
app.post('/games/:gameId/end', gameController.endGame);

// Debug endpoint to validate questions without creating a game
app.post('/games/validate', (req: Request, res: Response): void => {
  try {
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