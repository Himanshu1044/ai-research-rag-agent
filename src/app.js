import express from 'express';
import cors from "cors";
import healthRoutes from './routes/healthRoutes.js'
import userRoutes from './routes/userRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import documentRoutes from './routes/documentRoutes.js'
import memoryRoutes from './routes/memoryRoutes.js'
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://ai-research-rag-agent.vercel.app'
    ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRoutes);
app.use('/api', userRoutes)
app.use('/api', researchRoutes)
app.use('/api', documentRoutes)
app.use('/api', memoryRoutes);
app.use('/api', knowledgeRoutes);
app.use('/api', reportRoutes);

export default app;
