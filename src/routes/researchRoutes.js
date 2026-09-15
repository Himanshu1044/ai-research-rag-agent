import express from 'express';
import { createResearch, getResearchHistory, getResearchDetailsController} from '../controllers/researchController.js';
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router();

router.post('/research', authMiddleware, createResearch);
router.get('/research', authMiddleware, getResearchHistory);
router.get('/research/:id', authMiddleware, getResearchDetailsController);
export default router;