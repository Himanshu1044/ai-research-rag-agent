import { getResearchRequestById, updateResearchStatus } from '../services/researchService.js';
import { generateText } from '../services/llmService.js';
import { createReport } from '../services/reportService.js';
import { createResearchSource } from '../services/researchSourceService.js';

export const runResearchAgent = async (researchRequestId) => {
    const researchRequest = await getResearchRequestById(researchRequestId);

    await updateResearchStatus(researchRequestId, 'running')

    const question = researchRequest.question;

    const result = await generateText(
        question,
        researchRequest.user_id
    );

    const report = await createReport(
        researchRequestId,
        result.answer
    );

    for (let i = 0; i < result.sources.length; i++) {
        const source = result.sources[i];

        await createResearchSource(
            researchRequestId,
            source.url,
            source.title,
            i + 1
        );
    }
    const updatedResearchRequest = await updateResearchStatus(
        researchRequestId,
        'completed'
    );

    const sources = result.sources.map((source) => ({
        title: source.title,
        url: source.url
    }));

    const knowledge = result.knowledge.map((item) => ({
        documentId: item.document_id,
        documentTitle: item.title,
        source: item.source,
        chunkIndex: item.chunk_index,
        distance: item.distance
    }));


    return {
        researchRequest: updatedResearchRequest,
        report,
        sources,
        knowledge
    };
}