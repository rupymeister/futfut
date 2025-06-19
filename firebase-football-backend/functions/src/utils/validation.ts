import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validatePlayer = [
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('nationality').isString().notEmpty().withMessage('Nationality is required'),
  body('teamHistory').isArray().withMessage('Team history must be an array'),
  body('teamHistory.*.team').isString().notEmpty().withMessage('Team name is required'),
  body('teamHistory.*.seasons').isArray().withMessage('Seasons must be an array'),
  body('teamHistory.*.seasons.*.role').isString().notEmpty().withMessage('Role is required'),
];

export const validateGame = [
  body('playerId').isString().notEmpty().withMessage('Player ID is required'),
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('score').isNumeric().withMessage('Score must be a number'),
  body('totalCells').isNumeric().withMessage('Total cells must be a number'),
  body('validCells').isNumeric().withMessage('Valid cells must be a number'),
];

export const validateAnalyticsEvent = [
  body('eventType').isIn(['guess_made', 'guess_result', 'game_end']).withMessage('Invalid event type'),
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('timestamp').isISO8601().withMessage('Timestamp must be a valid date'),
];

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};