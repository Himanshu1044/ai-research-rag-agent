import {
    saveMemory,
    getMemoriesByUser
} from '../services/memoryService.js';

export const postMemory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                error: 'Memory content is required'
            });
        }

        const memory = await saveMemory(
            userId,
            content.trim()
        );

        return res.status(201).json({
            message: 'Memory saved successfully',
            memory
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export const getMemories = async (req, res) => {
    try {
        const userId = req.user.userId;

        const memories = await getMemoriesByUser(userId);

        return res.status(200).json({
            message: 'Memories retrieved successfully',
            memories
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};