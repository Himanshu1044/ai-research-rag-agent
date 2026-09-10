import express from 'express';
import { createResearch, getResearchHistory } from '../controllers/researchController.js';
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router();

router.post('/research', authMiddleware, createResearch);
router.get('/research', authMiddleware, getResearchHistory);

export default router;