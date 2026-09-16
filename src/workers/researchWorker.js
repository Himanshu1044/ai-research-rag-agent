import { Worker } from "bullmq";

import { runResearchAgent } from "../agents/researchAgent.js";
import { updateResearchStatus } from "../services/researchService.js";

const researchWorker = new Worker(
    "research",
    async (job) => {
        const { researchRequestId } = job.data;

        console.log(
            `Processing research request ${researchRequestId}`
        );

        try {
            await runResearchAgent(researchRequestId);

            console.log(
                `Research request ${researchRequestId} completed`
            );
        } catch (error) {
            console.error(
                `Research request ${researchRequestId} failed:`,
                error
            );

            if (job.attemptsMade + 1 >= job.opts.attempts) {
                await updateResearchStatus(
                    researchRequestId,
                    "failed"
                );
            }

            throw error;
        }
    },
    {
        connection: {
            host: "127.0.0.1",
            port: 6379
        }
    }
);

researchWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

researchWorker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
});

const shutdown = async () => {
    console.log("Shutting down research worker...");

    await researchWorker.close();

    console.log("Research worker shut down.");
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);