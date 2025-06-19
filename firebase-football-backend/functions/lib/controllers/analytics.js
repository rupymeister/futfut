"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameAnalytics = exports.getAnalyticsData = exports.trackEvent = void 0;
const analyticsService_1 = require("../services/analyticsService");
const index_1 = require("../index");
// Track an event
const trackEvent = async (req, res) => {
    try {
        const eventData = req.body;
        const result = await analyticsService_1.analyticsService.trackEvent(eventData);
        res.status(200).json({
            message: 'Event tracked successfully',
            event: result
        });
    }
    catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({
            error: 'Failed to track event',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.trackEvent = trackEvent;
// Retrieve analytics data
const getAnalyticsData = async (req, res) => {
    try {
        const filters = req.query;
        const data = await analyticsService_1.analyticsService.getAnalyticsData(filters);
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Error getting analytics data:', error);
        res.status(500).json({
            error: 'Failed to retrieve analytics data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAnalyticsData = getAnalyticsData;
// Get game analytics by mode
const getGameAnalytics = async (req, res) => {
    try {
        const { gameMode, playerId } = req.query;
        let query = index_1.db.collection('games');
        if (gameMode) {
            query = query.where('gameMode', '==', gameMode);
        }
        if (playerId) {
            query = query.where('playerId', '==', playerId);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
        const games = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json({
            success: true,
            games,
            total: games.length
        });
    }
    catch (error) {
        console.error('Error getting game analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get game analytics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getGameAnalytics = getGameAnalytics;
//# sourceMappingURL=analytics.js.map