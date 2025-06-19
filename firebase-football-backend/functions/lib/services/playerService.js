"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerService = exports.deletePlayer = exports.updatePlayer = exports.getPlayer = exports.createPlayer = void 0;
const index_1 = require("../index");
const createPlayer = async (playerData) => {
    const playerRef = index_1.db.collection('players').doc();
    await playerRef.set(Object.assign(Object.assign({ id: playerRef.id }, playerData), { createdAt: new Date(), updatedAt: new Date() }));
    return Object.assign({ id: playerRef.id }, playerData);
};
exports.createPlayer = createPlayer;
const getPlayer = async (playerId) => {
    const playerRef = index_1.db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) {
        throw new Error('Player not found');
    }
    return Object.assign({ id: playerDoc.id }, playerDoc.data());
};
exports.getPlayer = getPlayer;
const updatePlayer = async (playerId, playerData) => {
    const playerRef = index_1.db.collection('players').doc(playerId);
    await playerRef.update(Object.assign(Object.assign({}, playerData), { updatedAt: new Date() }));
    return Object.assign({ id: playerId }, playerData);
};
exports.updatePlayer = updatePlayer;
const deletePlayer = async (playerId) => {
    const playerRef = index_1.db.collection('players').doc(playerId);
    await playerRef.delete();
    return { id: playerId };
};
exports.deletePlayer = deletePlayer;
exports.playerService = {
    createPlayer: exports.createPlayer,
    getPlayer: exports.getPlayer,
    updatePlayer: exports.updatePlayer,
    deletePlayer: exports.deletePlayer
};
//# sourceMappingURL=playerService.js.map