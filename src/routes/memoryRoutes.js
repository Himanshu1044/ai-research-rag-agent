import express from 'express';

import {
    postMemory,
    getMemories
} from '../controllers/memoryController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/memories', authMiddleware, postMemory);

router.get('/memories', authMiddleware, getMemories);

export default router;