"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.getAnalyticsData = exports.trackEvent = void 0;
const index_1 = require("../index");
const trackEvent = async (eventData) => {
    try {
        const eventRef = index_1.db.collection('analytics').doc();
        const event = Object.assign(Object.assign({ id: eventRef.id }, eventData), { timestamp: new Date(), createdAt: new Date() });
        await eventRef.set(event);
        console.log('📊 Event tracked:', event.id);
        return event;
    }
    catch (error) {
        console.error('Error tracking event:', error);
        throw error;
    }
};
exports.trackEvent = trackEvent;
const getAnalyticsData = async (filters = {}) => {
    try {
        let query = index_1.db.collection('analytics');
        // Apply filters if provided
        if (filters.eventType) {
            query = query.where('eventType', '==', filters.eventType);
        }
        if (filters.playerId) {
            query = query.where('playerId', '==', filters.playerId);
        }
        if (filters.sessionId) {
            query = query.where('sessionId', '==', filters.sessionId);
        }
        // Order by timestamp and limit results
        query = query.orderBy('timestamp', 'desc').limit(Number(filters.limit) || 100);
        const snapshot = await query.get();
        const events = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return {
            events,
            total: events.length,
            filters
        };
    }
    catch (error) {
        console.error('Error getting analytics data:', error);
        throw error;
    }
};
exports.getAnalyticsData = getAnalyticsData;
exports.analyticsService = {
    trackEvent: exports.trackEvent,
    getAnalyticsData: exports.getAnalyticsData
};
//# sourceMappingURL=analyticsService.js.map