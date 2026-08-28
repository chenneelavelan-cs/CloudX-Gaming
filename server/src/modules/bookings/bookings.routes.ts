import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Booking } from '../../models/Booking';
import { GamingEntry } from '../../models/GamingEntry';
import { GamingOption } from '../../models/GamingOption';
import { PricingTier } from '../../models/PricingTier';
import { calculatePrice } from '../../services/pricing-engine';
import { checkResourceAvailability, getAvailableResources } from '../../services/availability';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';
import { generateReferenceCode } from '../../utils/helpers';
import { parsePagination, paginatedResult } from '../../utils/pagination';

const router = Router();

const createBookingSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  gamingOptionId: z.string(),
  resourceId: z.string().optional(),
  playerCount: z.number().min(1),
  scheduledStart: z.string().datetime(),
  durationMinutes: z.number().min(1),
  notes: z.string().optional(),
  source: z.enum(['admin', 'customer']).optional(),
});

const updateBookingSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  gamingOptionId: z.string().optional(),
  resourceId: z.string().nullable().optional(),
  playerCount: z.number().min(1).optional(),
  scheduledStart: z.string().datetime().optional(),
  durationMinutes: z.number().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'confirmed', 'started', 'completed', 'cancelled', 'no_show']).optional(),
});

async function computeSuggestedPrice(
  gamingOptionId: string,
  playerCount: number,
  durationMinutes: number
): Promise<number> {
  const option = await GamingOption.findById(gamingOptionId);
  if (!option) throw new AppError(404, 'Gaming option not found');

  const tiers = await PricingTier.find({ gamingOptionId, isActive: true });
  const pricing = calculatePrice({
    durationMinutes,
    playerCount,
    tiers: tiers.map((t) => ({
      durationMinutes: t.durationMinutes,
      price: t.price,
      playerCount: t.playerCount,
      label: t.label,
    })),
    supportsPlayerPricing: option.supportsPlayerPricing,
  });

  return pricing.price;
}

router.get(
  '/availability',
  asyncHandler(async (req: Request, res: Response) => {
    const optionId = req.query.optionId as string;
    const start = req.query.start as string;
    const end = req.query.end as string;

    if (!optionId || !start || !end) {
      throw new AppError(400, 'optionId, start, and end are required');
    }

    const results = await getAvailableResources(optionId, new Date(start), new Date(end));
    res.json(results.map((r) => ({ ...r.resource.toObject(), available: r.available })));
  })
);

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const date = new Date(req.query.date as string);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.scheduledStart = { $gte: date, $lt: nextDay };
    }
    if (req.query.customerId) filter.customerId = req.query.customerId;

    const pagination = parsePagination(req);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('gamingOptionId', 'name slug')
        .populate('resourceId', 'name code')
        .populate('customerId', 'name phone')
        .sort({ scheduledStart: 1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Booking.countDocuments(filter),
    ]);
    res.json(paginatedResult(bookings, total, pagination));
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await Booking.findById(req.params.id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code')
      .populate('customerId', 'name phone email');
    if (!booking) throw new AppError(404, 'Booking not found');
    res.json(booking);
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = createBookingSchema.parse(req.body);
    const scheduledStart = new Date(data.scheduledStart);
    const scheduledEnd = new Date(scheduledStart.getTime() + data.durationMinutes * 60 * 1000);

    if (data.resourceId) {
      const { available, conflicts } = await checkResourceAvailability({
        resourceId: data.resourceId,
        start: scheduledStart,
        end: scheduledEnd,
      });
      if (!available) {
        throw new AppError(409, 'Resource not available for selected time', { conflicts });
      }
    }

    const option = await GamingOption.findById(data.gamingOptionId);
    if (!option) throw new AppError(404, 'Gaming option not found');

    const suggestedPrice = await computeSuggestedPrice(
      data.gamingOptionId,
      data.playerCount,
      data.durationMinutes
    );

    const booking = await Booking.create({
      ...data,
      referenceCode: generateReferenceCode('CX-BK'),
      scheduledStart,
      scheduledEnd,
      suggestedPrice,
      status: 'confirmed',
      source: data.source || (req.user ? 'admin' : 'customer'),
    });

    res.status(201).json(booking);
  })
);

router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateBookingSchema.parse(req.body);
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new AppError(404, 'Booking not found');

    const editableStatuses = ['scheduled', 'confirmed'];
    const isStatusOnly =
      data.status !== undefined &&
      Object.keys(data).length === 1;

    if (!isStatusOnly && !editableStatuses.includes(booking.status)) {
      throw new AppError(400, 'Only scheduled or confirmed bookings can be edited');
    }

    if (
      (data.status === 'cancelled' || data.status === 'no_show') &&
      booking.status === 'completed'
    ) {
      throw new AppError(400, 'Cannot cancel a completed booking');
    }

    const gamingOptionId = data.gamingOptionId ?? booking.gamingOptionId.toString();
    const playerCount = data.playerCount ?? booking.playerCount;
    const durationMinutes = data.durationMinutes ?? booking.durationMinutes;
    const scheduledStart = data.scheduledStart ? new Date(data.scheduledStart) : booking.scheduledStart;
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
    const resourceId =
      data.resourceId === null
        ? undefined
        : data.resourceId !== undefined
          ? data.resourceId
          : booking.resourceId?.toString();

    const scheduleChanged =
      data.scheduledStart !== undefined ||
      data.durationMinutes !== undefined ||
      data.resourceId !== undefined;

    if (resourceId && scheduleChanged && !['cancelled', 'no_show', 'completed'].includes(data.status ?? booking.status)) {
      const { available, conflicts } = await checkResourceAvailability({
        resourceId,
        start: scheduledStart,
        end: scheduledEnd,
        excludeBookingId: booking._id.toString(),
      });
      if (!available) {
        throw new AppError(409, 'Resource not available for selected time', { conflicts });
      }
    }

    if (data.customerName !== undefined) booking.customerName = data.customerName;
    if (data.customerPhone !== undefined) booking.customerPhone = data.customerPhone;
    if (data.customerId !== undefined) booking.customerId = data.customerId as never;
    if (data.gamingOptionId !== undefined) booking.gamingOptionId = data.gamingOptionId as never;
    if (data.resourceId !== undefined) booking.resourceId = (data.resourceId ?? undefined) as never;
    if (data.playerCount !== undefined) booking.playerCount = data.playerCount;
    if (data.notes !== undefined) booking.notes = data.notes;
    if (data.status !== undefined) booking.status = data.status;

    booking.scheduledStart = scheduledStart;
    booking.scheduledEnd = scheduledEnd;
    booking.durationMinutes = durationMinutes;

    const pricingFieldsChanged =
      data.gamingOptionId !== undefined ||
      data.playerCount !== undefined ||
      data.durationMinutes !== undefined;

    if (pricingFieldsChanged) {
      booking.suggestedPrice = await computeSuggestedPrice(gamingOptionId, playerCount, durationMinutes);
    }

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code')
      .populate('customerId', 'name phone');

    res.json(populated);
  })
);

router.patch(
  '/:id/status',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = z
      .object({
        status: z.enum(['scheduled', 'confirmed', 'started', 'completed', 'cancelled', 'no_show']),
      })
      .parse(req.body);

    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) throw new AppError(404, 'Booking not found');
    res.json(booking);
  })
);

router.post(
  '/:id/start-gaming',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new AppError(404, 'Booking not found');
    if (!booking.resourceId) throw new AppError(400, 'Booking has no resource assigned');

    const now = new Date();
    const expectedEndAt = new Date(now.getTime() + booking.durationMinutes * 60 * 1000);

    const { available, conflicts } = await checkResourceAvailability({
      resourceId: booking.resourceId.toString(),
      start: now,
      end: expectedEndAt,
      excludeBookingId: booking._id.toString(),
    });
    if (!available) {
      throw new AppError(409, 'Resource not available', { conflicts });
    }

    const entry = await GamingEntry.create({
      customerId: booking.customerId,
      customerName: booking.customerName,
      bookingId: booking._id,
      gamingOptionId: booking.gamingOptionId,
      resourceId: booking.resourceId,
      playerCount: booking.playerCount,
      startedAt: now,
      expectedEndAt,
      durationMinutes: booking.durationMinutes,
      calculatedPrice: booking.suggestedPrice || 0,
      finalPrice: booking.suggestedPrice || 0,
      status: 'active',
    });

    booking.status = 'started';
    booking.gamingEntryId = entry._id;
    await booking.save();

    const populated = await GamingEntry.findById(entry._id)
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code');

    res.status(201).json(populated);
  })
);

export default router;

// Public booking lookup
export const publicBookingRouter = Router();

publicBookingRouter.get(
  '/:ref',
  asyncHandler(async (req: Request, res: Response) => {
    const phone = req.query.phone as string;
    if (!phone) throw new AppError(400, 'Phone number required');

    const ref = String(req.params.ref).toUpperCase();

    const booking = await Booking.findOne({
      referenceCode: ref,
      customerPhone: phone,
    })
      .populate('gamingOptionId', 'name slug')
      .populate('resourceId', 'name code');

    if (!booking) throw new AppError(404, 'Booking not found');
    res.json(booking);
  })
);
