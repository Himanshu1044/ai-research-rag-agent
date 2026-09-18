import express from 'express';

import {
    postKnowledgeRetrieval
} from '../controllers/knowledgeController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
    '/knowledge/retrieve',
    authMiddleware,
    postKnowledgeRetrieval
);

export default router;