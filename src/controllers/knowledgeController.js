import { retrieveKnowledge } from '../services/retrievalService.js';

export const postKnowledgeRetrieval = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { query, limit } = req.body;

        if (!query || !query.trim()) {
            return res.status(400).json({
                error: 'Query is required'
            });
        }

        const knowledge = await retrieveKnowledge(
            userId,
            query.trim(),
            limit
        );

        return res.status(200).json({
            message: 'Knowledge retrieved successfully',
            knowledge
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};