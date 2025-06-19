import { Request, Response } from 'express';
import { playerService } from '../services/playerService';

export const createPlayer = async (req: Request, res: Response) => {
    try {
        const playerData = req.body;
        const result = await playerService.createPlayer(playerData);
        res.status(201).json({
            message: 'Player created successfully',
            player: result
        });
    } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({
            error: 'Failed to create player',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getPlayer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const player = await playerService.getPlayer(id);
        res.status(200).json(player);
    } catch (error) {
        console.error('Error getting player:', error);
        if (error instanceof Error && error.message === 'Player not found') {
            res.status(404).json({ error: 'Player not found' });
        } else {
            res.status(500).json({
                error: 'Failed to get player',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};

export const updatePlayer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const playerData = req.body;
        const result = await playerService.updatePlayer(id, playerData);
        res.status(200).json({
            message: 'Player updated successfully',
            player: result
        });
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({
            error: 'Failed to update player',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const deletePlayer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await playerService.deletePlayer(id);
        res.status(200).json({
            message: 'Player deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({
            error: 'Failed to delete player',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};