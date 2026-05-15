import { Router } from 'express';
import { authController } from '../controller/auth-controller.js';
import { validate, authenticate, registerLimiter, loginLimiter, refreshLimiter } from '@campushub/shared';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth-validators.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);

export default router;
