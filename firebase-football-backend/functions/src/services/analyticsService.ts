import { db } from '../index';

export const trackEvent = async (eventData: any) => {
    try {
        const eventRef = db.collection('analytics').doc();
        const event = {
            id: eventRef.id,
            ...eventData,
            timestamp: new Date(),
            createdAt: new Date()
        };
        
        await eventRef.set(event);
        console.log('📊 Event tracked:', event.id);
        return event;
    } catch (error) {
        console.error('Error tracking event:', error);
        throw error;
    }
};

export const getAnalyticsData = async (filters: any = {}) => {
    try {
        let query: FirebaseFirestore.Query = db.collection('analytics');
        
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
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        return {
            events,
            total: events.length,
            filters
        };
    } catch (error) {
        console.error('Error getting analytics data:', error);
        throw error;
    }
};

export const analyticsService = {
    trackEvent,
    getAnalyticsData
};