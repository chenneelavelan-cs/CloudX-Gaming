import { Router, Request, Response } from 'express';
import { GamingOption } from '../../models/GamingOption';
import { Product } from '../../models/Product';
import { PricingTier } from '../../models/PricingTier';
import { asyncHandler } from '../../utils/errors';

const router = Router();

router.get(
  '/gaming-options',
  asyncHandler(async (_req: Request, res: Response) => {
    const options = await GamingOption.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json(options);
  })
);

router.get(
  '/products',
  asyncHandler(async (_req: Request, res: Response) => {
    const products = await Product.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json(products);
  })
);

router.get(
  '/pricing',
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = { isActive: true };
    if (req.query.optionId) filter.gamingOptionId = req.query.optionId;

    const tiers = await PricingTier.find(filter)
      .populate('gamingOptionId', 'name slug supportsPlayerPricing minDurationMinutes')
      .sort({ gamingOptionId: 1, playerCount: 1, durationMinutes: 1 });

    res.json(tiers);
  })
);

export default router;
