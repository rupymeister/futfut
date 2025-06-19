import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { db } from '../index';

// Track an event
export const trackEvent = async (req: Request, res: Response) => {
    try {
        const eventData = req.body;
        const result = await analyticsService.trackEvent(eventData);
        res.status(200).json({ 
            message: 'Event tracked successfully',
            event: result
        });
    } catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({ 
            error: 'Failed to track event',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Retrieve analytics data
export const getAnalyticsData = async (req: Request, res: Response) => {
    try {
        const filters = req.query;
        const data = await analyticsService.getAnalyticsData(filters);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error getting analytics data:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve analytics data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get game analytics by mode
export const getGameAnalytics = async (req: Request, res: Response) => {
    try {
        const { gameMode, playerId } = req.query;
        
        let query: FirebaseFirestore.Query = db.collection('games');
        
        if (gameMode) {
            query = query.where('gameMode', '==', gameMode);
        }
        if (playerId) {
            query = query.where('playerId', '==', playerId);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
        const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        res.status(200).json({
            success: true,
            games,
            total: games.length
        });
    } catch (error) {
        console.error('Error getting game analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get game analytics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};