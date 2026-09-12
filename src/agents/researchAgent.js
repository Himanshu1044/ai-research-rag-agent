import { getResearchRequestById, updateResearchStatus } from '../services/researchService.js';
import { generateText } from '../services/llmService.js';
import { createReport } from '../services/reportService.js';
import { createResearchSource } from '../services/researchSourceService.js';

export const runResearchAgent = async (researchRequestId) => {
    const researchRequest = await getResearchRequestById(researchRequestId);

    await updateResearchStatus(researchRequestId, 'running')

    const question = researchRequest.question;

    const result = await generateText(question);
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
            source.content,
            i + 1
        );
    }
    await updateResearchStatus(
        researchRequestId,
        'completed'
    );
}