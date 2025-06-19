import { db } from '../index';
import { Player } from '../models/Player';

export const createPlayer = async (playerData: Partial<Player>) => {
    const playerRef = db.collection('players').doc();
    await playerRef.set({ 
        id: playerRef.id, 
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return { id: playerRef.id, ...playerData };
};

export const getPlayer = async (playerId: string) => {
    const playerRef = db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) {
        throw new Error('Player not found');
    }
    return { id: playerDoc.id, ...playerDoc.data() } as Player;
};

export const updatePlayer = async (playerId: string, playerData: Partial<Player>) => {
    const playerRef = db.collection('players').doc(playerId);
    await playerRef.update({
        ...playerData,
        updatedAt: new Date()
    });
    return { id: playerId, ...playerData };
};

export const deletePlayer = async (playerId: string) => {
    const playerRef = db.collection('players').doc(playerId);
    await playerRef.delete();
    return { id: playerId };
};

export const playerService = {
    createPlayer,
    getPlayer,
    updatePlayer,
    deletePlayer
};