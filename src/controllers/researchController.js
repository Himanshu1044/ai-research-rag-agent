import { createResearchRequest, getResearchRequestsByUser, updateResearchStatus, getResearchDetails } from '../services/researchService.js';
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

        const researchResult = await runResearchAgent(
            researchRequest.id
        );

        return res.status(201).json({
            message: 'Research completed successfully',
            researchRequest: researchResult.researchRequest,
            report: researchResult.report,
            sources: researchResult.sources
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

export const getResearchDetailsController = async (req, res) => {
    try {
        const userId = req.user.userId;
        const researchRequestId = req.params.id;

        const researchDetails = await getResearchDetails(
            researchRequestId,
            userId
        );

        if (!researchDetails) {
            return res.status(404).json({
                error: 'Research request not found'
            });
        }

        return res.status(200).json(researchDetails);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};