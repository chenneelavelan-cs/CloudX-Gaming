import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config';
import { User } from '../../models/User';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: payload, token });
  })
);

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ user: req.user });
  })
);

export default router;
