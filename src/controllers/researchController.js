import { createResearchRequest, getResearchRequestsByUser, updateResearchStatus } from '../services/researchService.js';
import { runResearchAgent } from '../agents/researchAgent.js';

export const createResearch = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                error: 'Question is required'
            });
        }

        const researchRequest = await createResearchRequest(
            userId,
            question
        );
        
        await runResearchAgent(researchRequest.id)

        return res.status(201).json({
            message: 'Research request created successfully',
            researchRequest
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};

export const getResearchHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const researchHistory = await getResearchRequestsByUser(userId)

        return res.status(200).json({
            message: `Research History`,
            researchHistory
        })
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal Server Error'
        })
    }
}

