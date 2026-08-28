import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Bill, IBillItem } from '../../models/Bill';
import { Customer } from '../../models/Customer';
import { CustomerMembership } from '../../models/Membership';
import { GamingEntry } from '../../models/GamingEntry';
import { GamingOption } from '../../models/GamingOption';
import { getNextBillNumber } from '../../models/Settings';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';
import { parsePagination, paginatedResult } from '../../utils/pagination';

const router = Router();

const billItemSchema = z.object({
  type: z.enum(['gaming', 'product', 'combo', 'custom']),
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  gamingEntryId: z.string().optional(),
  gamingOptionId: z.string().optional(),
  productId: z.string().optional(),
  comboId: z.string().optional(),
  playerCount: z.number().optional(),
  durationMinutes: z.number().optional(),
  calculatedPrice: z.number().optional(),
  isPriceOverridden: z.boolean().optional(),
});

const createBillSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(billItemSchema).min(1),
  linkedBookingIds: z.array(z.string()).optional(),
  linkedGamingEntryIds: z.array(z.string()).optional(),
  paymentMethod: z.enum(['cash', 'upi']),
  discountDetails: z
    .object({
      manualDiscount: z.number().optional(),
      manualDiscountReason: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

function computeItemTotal(item: z.infer<typeof billItemSchema>): number {
  const discount = item.discount || 0;
  return item.quantity * item.unitPrice - discount;
}

function computePlanProductDiscount(
  items: IBillItem[],
  membership: InstanceType<typeof CustomerMembership> & { planId: { discountRules: Array<{ gamingOptionId?: { toString(): string }; productCategory?: string; discountType: string; discountValue: number }> } }
): number {
  let totalDiscount = 0;
  for (const item of items) {
    for (const rule of membership.planId.discountRules) {
      const matchesCategory =
        item.type === 'product' &&
        rule.productCategory &&
        item.description?.includes(rule.productCategory);

      if (matchesCategory) {
        if (rule.discountType === 'percentage') {
          totalDiscount += (item.total * rule.discountValue) / 100;
        } else {
          totalDiscount += rule.discountValue;
        }
      }
    }
  }
  return totalDiscount;
}

function computeOptionMembershipDiscount(
  items: IBillItem[],
  optionDiscounts: Map<string, number>
): number {
  let totalDiscount = 0;
  for (const item of items) {
    if (item.type !== 'gaming' || !item.gamingOptionId) continue;
    const percent = optionDiscounts.get(item.gamingOptionId.toString()) ?? 0;
    if (percent > 0) {
      totalDiscount += (item.total * percent) / 100;
    }
  }
  return totalDiscount;
}

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.paymentStatus = req.query.status;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.date) {
      const date = new Date(req.query.date as string);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.createdAt = { $gte: date, $lt: nextDay };
    }

    const pagination = parsePagination(req);
    const [bills, total] = await Promise.all([
      Bill.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      Bill.countDocuments(filter),
    ]);

    const response = {
      ...paginatedResult(bills, total, pagination),
      summary: undefined as { paidCount: number; paidTotal: number; cancelledCount: number } | undefined,
    };
    if (pagination.page === 1) {
      const baseFilter = { ...filter };
      delete baseFilter.paymentStatus;
      const [paidCount, paidAgg, cancelledCount] = await Promise.all([
        Bill.countDocuments({ ...baseFilter, paymentStatus: 'paid' }),
        Bill.aggregate([
          { $match: { ...baseFilter, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Bill.countDocuments({ ...baseFilter, paymentStatus: 'cancelled' }),
      ]);
      response.summary = {
        paidCount,
        paidTotal: paidAgg[0]?.total ?? 0,
        cancelledCount,
      };
    }

    res.json(response);
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill) throw new AppError(404, 'Bill not found');
    res.json(bill);
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createBillSchema.parse(req.body);

    const items: IBillItem[] = data.items.map((item) => ({
      type: item.type,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      total: computeItemTotal(item),
      gamingEntryId: item.gamingEntryId ? new Types.ObjectId(item.gamingEntryId) : undefined,
      gamingOptionId: item.gamingOptionId ? new Types.ObjectId(item.gamingOptionId) : undefined,
      productId: item.productId ? new Types.ObjectId(item.productId) : undefined,
      comboId: item.comboId ? new Types.ObjectId(item.comboId) : undefined,
      playerCount: item.playerCount,
      durationMinutes: item.durationMinutes,
      calculatedPrice: item.calculatedPrice,
      isPriceOverridden: item.isPriceOverridden || (item.calculatedPrice !== undefined && item.unitPrice !== item.calculatedPrice),
    }));

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    let discountAmount = data.discountDetails?.manualDiscount || 0;

    if (data.customerId) {
      const membership = await CustomerMembership.findOne({
        customerId: data.customerId,
        status: 'active',
        expiryDate: { $gte: new Date() },
      }).populate<{ planId: { discountRules: Array<{ gamingOptionId?: { toString(): string }; productCategory?: string; discountType: string; discountValue: number }> } }>('planId');

      if (membership) {
        const gamingOptionIds = [
          ...new Set(
            items
              .filter((item) => item.type === 'gaming' && item.gamingOptionId)
              .map((item) => item.gamingOptionId!.toString())
          ),
        ];

        const options = gamingOptionIds.length
          ? await GamingOption.find({ _id: { $in: gamingOptionIds } }).select('_id membershipDiscountPercent')
          : [];

        const optionDiscounts = new Map(
          options.map((option) => [option._id.toString(), option.membershipDiscountPercent ?? 0])
        );

        discountAmount += computeOptionMembershipDiscount(items, optionDiscounts);
        discountAmount += computePlanProductDiscount(items, membership as never);
      }
    }

    const total = Math.max(0, subtotal - discountAmount);
    const billNumber = await getNextBillNumber();

    const bill = await Bill.create({
      billNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      items,
      linkedBookingIds: data.linkedBookingIds || [],
      linkedGamingEntryIds: data.linkedGamingEntryIds || [],
      subtotal,
      discountAmount,
      discountDetails: data.discountDetails,
      taxAmount: 0,
      total,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'paid',
      paidAt: new Date(),
      notes: data.notes,
      createdBy: req.user!.userId,
    });

    const entryIds = [
      ...(data.linkedGamingEntryIds || []),
      ...items.filter((i) => i.gamingEntryId).map((i) => i.gamingEntryId!.toString()),
    ];
    const uniqueEntryIds = [...new Set(entryIds.filter(Boolean))];

    if (uniqueEntryIds.length) {
      const now = new Date();
      const entries = await GamingEntry.find({ _id: { $in: uniqueEntryIds } });

      await Promise.all(
        entries.map(async (entry) => {
          entry.billId = bill._id;
          entry.status = 'completed';
          entry.endedAt = now;
          entry.actualDurationMinutes = Math.max(
            1,
            Math.round((now.getTime() - entry.startedAt.getTime()) / 60000)
          );
          await entry.save();
        })
      );

      bill.linkedGamingEntryIds = uniqueEntryIds.map((id) => new Types.ObjectId(id));
      await bill.save();
    }

    if (bill.customerId) {
      await Customer.findByIdAndUpdate(bill.customerId, {
        $inc: { totalVisits: 1, totalSpending: bill.total },
        lastVisitAt: new Date(),
      });
    }

    res.status(201).json(bill);
  })
);

router.post(
  '/:id/cancel',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'cancelled' },
      { new: true }
    );
    if (!bill) throw new AppError(404, 'Bill not found');
    res.json(bill);
  })
);

export default router;
