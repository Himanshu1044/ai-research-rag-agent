import { getResearchRequestById, updateResearchStatus } from '../services/researchService.js'

export const runResearchAgent = async (researchRequestId) => {
    const researchRequest = await getResearchRequestById(researchRequestId);

    await updateResearchStatus(researchRequestId, 'running')

    console.log('Research question:', researchRequest.question);

}