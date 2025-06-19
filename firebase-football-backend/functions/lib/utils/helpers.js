"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = exports.isValidDate = exports.getCurrentTimestamp = exports.generateId = exports.handleError = exports.formatGameSessionData = exports.formatGameData = exports.formatPlayerData = void 0;
const firebase_admin_1 = require("firebase-admin");
const formatPlayerData = (data) => {
    return {
        name: data.name,
        nationality: data.nationality,
        teamHistory: data.teamHistory || [],
    };
};
exports.formatPlayerData = formatPlayerData;
const formatGameData = (data) => {
    return {
        date: data.date,
        players: data.players || [],
        score: data.score || {},
    };
};
exports.formatGameData = formatGameData;
const formatGameSessionData = (data) => {
    return {
        gameId: data.gameId,
        playerId: data.playerId,
        score: data.score || 0,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    };
};
exports.formatGameSessionData = formatGameSessionData;
const handleError = (error) => {
    console.error('Error:', error);
    return {
        success: false,
        message: error.message || 'An error occurred',
    };
};
exports.handleError = handleError;
const generateId = (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateId = generateId;
const getCurrentTimestamp = () => {
    return new Date();
};
exports.getCurrentTimestamp = getCurrentTimestamp;
const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date.getTime());
};
exports.isValidDate = isValidDate;
const sanitizeString = (str) => {
    return str.trim().toLowerCase();
};
exports.sanitizeString = sanitizeString;
//# sourceMappingURL=helpers.js.map