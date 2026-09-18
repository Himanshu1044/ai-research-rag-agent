import { getMemoriesByUser } from '../services/memoryService.js';

export const retrieveMemory = async (userId) => {
    return await getMemoriesByUser(userId);
};