import { Queue } from "bullmq";

const researchQueue = new Queue("research", {
    connection: {
        host: "research-redis",
        port: 6379
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