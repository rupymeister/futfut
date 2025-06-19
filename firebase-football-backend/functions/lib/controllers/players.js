"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlayer = exports.updatePlayer = exports.getPlayer = exports.createPlayer = void 0;
const playerService_1 = require("../services/playerService");
const createPlayer = async (req, res) => {
    try {
        const playerData = req.body;
        const result = await playerService_1.playerService.createPlayer(playerData);
        res.status(201).json({
            message: 'Player created successfully',
            player: result
        });
    }
    catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({
            error: 'Failed to create player',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createPlayer = createPlayer;
const getPlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const player = await playerService_1.playerService.getPlayer(id);
        res.status(200).json(player);
    }
    catch (error) {
        console.error('Error getting player:', error);
        if (error instanceof Error && error.message === 'Player not found') {
            res.status(404).json({ error: 'Player not found' });
        }
        else {
            res.status(500).json({
                error: 'Failed to get player',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.getPlayer = getPlayer;
const updatePlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const playerData = req.body;
        const result = await playerService_1.playerService.updatePlayer(id, playerData);
        res.status(200).json({
            message: 'Player updated successfully',
            player: result
        });
    }
    catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({
            error: 'Failed to update player',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updatePlayer = updatePlayer;
const deletePlayer = async (req, res) => {
    try {
        const { id } = req.params;
        await playerService_1.playerService.deletePlayer(id);
        res.status(200).json({
            message: 'Player deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({
            error: 'Failed to delete player',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deletePlayer = deletePlayer;
//# sourceMappingURL=players.js.map