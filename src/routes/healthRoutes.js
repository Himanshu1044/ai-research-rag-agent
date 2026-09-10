import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "AI Research & RAG Agent API is running"
    })
});

export default router;