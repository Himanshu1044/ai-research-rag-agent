import express from 'express';
import { loginUser, postUser, getProfile } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/auth/register', postUser);
router.post('/auth/login', loginUser);
router.get('/profile',authMiddleware,getProfile);

export default router;