import { saveMemory as saveMemoryToDatabase } from '../services/memoryService.js';

export const saveMemory = async (userId, content) => {
    return await saveMemoryToDatabase(userId, content);
};