import express from 'express';

import { postDocument, getDocuments } from '../controllers/documentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/documents', authMiddleware, postDocument)
router.get('/documents', authMiddleware, getDocuments)

export default router;