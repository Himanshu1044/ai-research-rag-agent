import express from 'express';
import healthRoutes from './routes/healthRoutes.js'
import userRoutes from './routes/userRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import documentRoutes from './routes/documentRoutes.js'

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRoutes);
app.use('/api', userRoutes)
app.use('/api', researchRoutes)
app.use('/api', documentRoutes)

export default app;
