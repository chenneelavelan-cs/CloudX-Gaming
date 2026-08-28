import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GamingEntry } from '../../models/GamingEntry';
import { PricingTier } from '../../models/PricingTier';
import { GamingOption } from '../../models/GamingOption';
import { calculatePrice } from '../../services/pricing-engine';
import { checkResourceAvailability } from '../../services/availability';
import { getSettings } from '../../models/Settings';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

const createEntrySchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  bookingId: z.string().optional(),
  gamingOptionId: z.string(),
  resourceId: z.string(),
  playerCount: z.number().min(1),
  durationMinutes: z.number().min(1),
  priceOverride: z.number().optional(),
  notes: z.string().optional(),
  startedAt: z.string().datetime().optional(),
});

function getSessionUrgency(expectedEndAt: Date, thresholds: { endingSoonMinutes: number; almostEndedMinutes: number }) {
  const now = Date.now();
  const end = expectedEndAt.getTime();
  const remainingMs = end - now;

  if (remainingMs <= 0) return 'overdue';
  if (remainingMs <= thresholds.almostEndedMinutes * 60 * 1000) return 'almost_ended';
  if (remainingMs <= thresholds.endingSoonMinutes * 60 * 1000) return 'ending_soon';
  return 'normal';
}

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;

    const settings = await getSettings();
    const entries = await GamingEntry.find(filter)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code')
      .populate('customerId', 'name phone')
      .sort({ expectedEndAt: 1 });

    const enriched = entries.map((e) => ({
      ...e.toObject(),
      urgency: e.status === 'active' ? getSessionUrgency(e.expectedEndAt, settings.sessionWarningThresholds) : null,
      remainingMinutes: e.status === 'active' ? Math.max(0, Math.round((e.expectedEndAt.getTime() - Date.now()) / 60000)) : 0,
    }));

    res.json(enriched);
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await GamingEntry.findById(req.params.id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code')
      .populate('customerId', 'name phone');
    if (!entry) throw new AppError(404, 'Gaming entry not found');
    res.json(entry);
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createEntrySchema.parse(req.body);
    const startedAt = data.startedAt ? new Date(data.startedAt) : new Date();
    const expectedEndAt = new Date(startedAt.getTime() + data.durationMinutes * 60 * 1000);

    const { available, conflicts } = await checkResourceAvailability({
      resourceId: data.resourceId,
      start: startedAt,
      end: expectedEndAt,
    });
    if (!available) {
      throw new AppError(409, 'Resource not available', { conflicts });
    }

    const option = await GamingOption.findById(data.gamingOptionId);
    if (!option) throw new AppError(404, 'Gaming option not found');

    const tiers = await PricingTier.find({ gamingOptionId: data.gamingOptionId, isActive: true });
    const pricing = calculatePrice({
      durationMinutes: data.durationMinutes,
      playerCount: data.playerCount,
      tiers: tiers.map((t) => ({
        durationMinutes: t.durationMinutes,
        price: t.price,
        playerCount: t.playerCount,
        label: t.label,
      })),
      supportsPlayerPricing: option.supportsPlayerPricing,
    });

    const finalPrice = data.priceOverride ?? pricing.price;

    const entry = await GamingEntry.create({
      ...data,
      startedAt,
      expectedEndAt,
      calculatedPrice: pricing.price,
      priceOverride: data.priceOverride,
      finalPrice,
      status: 'active',
    });

    const populated = await GamingEntry.findById(entry._id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code');

    res.status(201).json(populated);
  })
);

router.post(
  '/:id/extend',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { additionalMinutes } = z.object({ additionalMinutes: z.number().min(1) }).parse(req.body);

    const entry = await GamingEntry.findById(req.params.id);
    if (!entry) throw new AppError(404, 'Gaming entry not found');
    if (entry.status !== 'active') throw new AppError(400, 'Can only extend active sessions');

    const previousEndAt = entry.expectedEndAt;
    const newEndAt = new Date(entry.expectedEndAt.getTime() + additionalMinutes * 60 * 1000);
    const newDurationMinutes = entry.durationMinutes + additionalMinutes;

    const { available, conflicts } = await checkResourceAvailability({
      resourceId: entry.resourceId.toString(),
      start: entry.startedAt,
      end: newEndAt,
      excludeEntryId: entry._id.toString(),
    });
    if (!available) {
      throw new AppError(409, 'Extension conflicts with another booking/session', { conflicts });
    }

    const tiers = await PricingTier.find({ gamingOptionId: entry.gamingOptionId, isActive: true });
    const option = await GamingOption.findById(entry.gamingOptionId);
    const pricing = calculatePrice({
      durationMinutes: newDurationMinutes,
      playerCount: entry.playerCount,
      tiers: tiers.map((t) => ({
        durationMinutes: t.durationMinutes,
        price: t.price,
        playerCount: t.playerCount,
        label: t.label,
      })),
      supportsPlayerPricing: option?.supportsPlayerPricing,
    });

    const previousPrice = entry.finalPrice;
    entry.extensionHistory.push({
      extendedAt: new Date(),
      addedMinutes: additionalMinutes,
      previousEndAt,
      newEndAt,
      previousPrice,
      newPrice: pricing.price,
    });

    entry.expectedEndAt = newEndAt;
    entry.durationMinutes = newDurationMinutes;
    entry.calculatedPrice = pricing.price;
    if (!entry.priceOverride) {
      entry.finalPrice = pricing.price;
    }
    await entry.save();

    const populated = await GamingEntry.findById(entry._id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code');

    res.json({ entry: populated, pricing });
  })
);

router.post(
  '/:id/end',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await GamingEntry.findById(req.params.id);
    if (!entry) throw new AppError(404, 'Gaming entry not found');
    if (entry.status !== 'active') throw new AppError(400, 'Session is not active');

    const now = new Date();
    entry.status = 'completed';
    entry.endedAt = now;
    entry.actualDurationMinutes = Math.round((now.getTime() - entry.startedAt.getTime()) / 60000);
    await entry.save();

    res.json(entry);
  })
);

router.post(
  '/:id/create-bill-draft',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const entry = await GamingEntry.findById(req.params.id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code')
      .populate('customerId', 'name phone');

    if (!entry) throw new AppError(404, 'Gaming entry not found');

    const option = entry.gamingOptionId as unknown as { name: string; _id: string };
    const linkedCustomer = entry.customerId as unknown as { _id: string; name: string; phone: string } | null;
    const durationLabel =
      entry.durationMinutes >= 60
        ? `${entry.durationMinutes / 60} hour${entry.durationMinutes > 60 ? 's' : ''}`
        : `${entry.durationMinutes} min`;

    const draft = {
      customerId: linkedCustomer?._id ?? entry.customerId,
      customerName: linkedCustomer?.name ?? entry.customerName,
      customerPhone: linkedCustomer?.phone,
      linkedGamingEntryIds: [entry._id],
      linkedBookingIds: entry.bookingId ? [entry.bookingId] : [],
      items: [
        {
          type: 'gaming' as const,
          name: option.name,
          description: `${durationLabel} — ${entry.playerCount} player(s) — ${(entry.resourceId as unknown as { name: string }).name}`,
          quantity: 1,
          unitPrice: entry.finalPrice,
          discount: 0,
          total: entry.finalPrice,
          gamingEntryId: entry._id,
          gamingOptionId: option._id,
          playerCount: entry.playerCount,
          durationMinutes: entry.durationMinutes,
          calculatedPrice: entry.calculatedPrice,
          isPriceOverridden: !!entry.priceOverride,
        },
      ],
      subtotal: entry.finalPrice,
    };

    res.json(draft);
  })
);

export default router;
