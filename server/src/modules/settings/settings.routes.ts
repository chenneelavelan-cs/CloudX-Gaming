import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSettings } from '../../models/Settings';
import { asyncHandler } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';
import { Settings } from '../../models/Settings';

const router = Router();

const updateSettingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  sessionExtensionOptions: z.array(z.number().min(1)).optional(),
  sessionWarningThresholds: z
    .object({
      endingSoonMinutes: z.number().min(1),
      almostEndedMinutes: z.number().min(1),
    })
    .optional(),
  billNumberPrefix: z.string().min(1).optional(),
  taxEnabled: z.boolean().optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  operatingHours: z
    .object({
      open: z.string(),
      close: z.string(),
    })
    .optional(),
});

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await getSettings();
    res.json(settings);
  })
);

router.patch(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateSettingsSchema.parse(req.body);
    const settings = await Settings.findOneAndUpdate({ key: 'global' }, data, {
      new: true,
      upsert: true,
    });
    res.json(settings);
  })
);

export default router;
