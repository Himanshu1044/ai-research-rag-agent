import { Queue } from "bullmq";

const researchQueue = new Queue("research", {
    connection: {
        host: "127.0.0.1",
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