import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PricingTier } from '../../models/PricingTier';
import { GamingOption } from '../../models/GamingOption';
import { calculatePrice } from '../../services/pricing-engine';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

const createTierSchema = z.object({
  gamingOptionId: z.string(),
  playerCount: z.number().min(1).optional(),
  durationMinutes: z.number().min(1),
  price: z.number().min(0),
  label: z.string().optional(),
});

const updateTierSchema = createTierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const calculateSchema = z.object({
  gamingOptionId: z.string(),
  playerCount: z.number().min(1).default(1),
  durationMinutes: z.number().min(1),
});

router.get(
  '/tiers',
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = { isActive: true };
    if (req.query.optionId) filter.gamingOptionId = req.query.optionId;
    if (req.query.active === 'false') delete filter.isActive;

    const tiers = await PricingTier.find(filter)
      .populate('gamingOptionId', 'name slug supportsPlayerPricing membershipDiscountPercent')
      .sort({ gamingOptionId: 1, playerCount: 1, durationMinutes: 1 });
    res.json(tiers);
  })
);

router.post(
  '/tiers',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createTierSchema.parse(req.body);
    const option = await GamingOption.findById(data.gamingOptionId);
    if (!option) throw new AppError(404, 'Gaming option not found');

    const tier = await PricingTier.create(data);
    res.status(201).json(tier);
  })
);

router.patch(
  '/tiers/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateTierSchema.parse(req.body);
    const tier = await PricingTier.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!tier) throw new AppError(404, 'Pricing tier not found');
    res.json(tier);
  })
);

router.post(
  '/calculate',
  asyncHandler(async (req: Request, res: Response) => {
    const { gamingOptionId, playerCount, durationMinutes } = calculateSchema.parse(req.body);

    const option = await GamingOption.findById(gamingOptionId);
    if (!option) throw new AppError(404, 'Gaming option not found');

    const dbTiers = await PricingTier.find({ gamingOptionId, isActive: true });
    const tiers = dbTiers.map((t) => ({
      durationMinutes: t.durationMinutes,
      price: t.price,
      playerCount: t.playerCount,
      label: t.label,
    }));

    const result = calculatePrice({
      durationMinutes,
      playerCount,
      tiers,
      supportsPlayerPricing: option.supportsPlayerPricing,
    });
    res.json({ ...result, gamingOption: option.name });
  })
);

export default router;
