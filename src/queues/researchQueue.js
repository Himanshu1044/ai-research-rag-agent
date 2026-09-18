import { Queue } from "bullmq";

const researchQueue = new Queue("research", {
    connection: {
        url: process.env.REDIS_URL
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: true
    }
});

export default researchQueue;