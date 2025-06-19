"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validateAnalyticsEvent = exports.validateGame = exports.validatePlayer = void 0;
const express_validator_1 = require("express-validator");
exports.validatePlayer = [
    (0, express_validator_1.body)('name').isString().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('nationality').isString().notEmpty().withMessage('Nationality is required'),
    (0, express_validator_1.body)('teamHistory').isArray().withMessage('Team history must be an array'),
    (0, express_validator_1.body)('teamHistory.*.team').isString().notEmpty().withMessage('Team name is required'),
    (0, express_validator_1.body)('teamHistory.*.seasons').isArray().withMessage('Seasons must be an array'),
    (0, express_validator_1.body)('teamHistory.*.seasons.*.role').isString().notEmpty().withMessage('Role is required'),
];
exports.validateGame = [
    (0, express_validator_1.body)('playerId').isString().notEmpty().withMessage('Player ID is required'),
    (0, express_validator_1.body)('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    (0, express_validator_1.body)('score').isNumeric().withMessage('Score must be a number'),
    (0, express_validator_1.body)('totalCells').isNumeric().withMessage('Total cells must be a number'),
    (0, express_validator_1.body)('validCells').isNumeric().withMessage('Valid cells must be a number'),
];
exports.validateAnalyticsEvent = [
    (0, express_validator_1.body)('eventType').isIn(['guess_made', 'guess_result', 'game_end']).withMessage('Invalid event type'),
    (0, express_validator_1.body)('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    (0, express_validator_1.body)('timestamp').isISO8601().withMessage('Timestamp must be a valid date'),
];
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map