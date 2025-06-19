import { firestore } from 'firebase-admin';

export const formatPlayerData = (data: any) => {
    return {
        name: data.name,
        nationality: data.nationality,
        teamHistory: data.teamHistory || [],
    };
};

export const formatGameData = (data: any) => {
    return {
        date: data.date,
        players: data.players || [],
        score: data.score || {},
    };
};

export const formatGameSessionData = (data: any) => {
    return {
        gameId: data.gameId,
        playerId: data.playerId,
        score: data.score || 0,
        timestamp: firestore.FieldValue.serverTimestamp(),
    };
};

export const handleError = (error: any) => {
    console.error('Error:', error);
    return {
        success: false,
        message: error.message || 'An error occurred',
    };
};

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentTimestamp = (): Date => {
  return new Date();
};

export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const sanitizeString = (str: string): string => {
  return str.trim().toLowerCase();
};