import express from 'express';

import {
    getReport
} from '../controllers/reportController.js';

import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get(
    '/reports/:id',
    authMiddleware,
    getReport
);

export default router;