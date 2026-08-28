import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Bill } from '../../models/Bill';
import { GamingEntry } from '../../models/GamingEntry';
import { Customer } from '../../models/Customer';
import { CustomerMembership } from '../../models/Membership';
import { GamingResource } from '../../models/GamingOption';
import { Booking } from '../../models/Booking';
import { getSettings } from '../../models/Settings';
import { asyncHandler } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

function parseDay(value: string, end = false): Date {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) {
    const fallback = new Date();
    if (end) fallback.setHours(23, 59, 59, 999);
    else fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  return end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= last) {
    days.push(formatYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function eachMonth(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function rangeUsesMonthly(from: Date, to: Date): boolean {
  return Math.ceil((to.getTime() - from.getTime()) / 86400000) > 62;
}

function getDateRange(req: Request, fallback: 'today' | 'month' = 'today'): { from: Date; to: Date } {
  if (req.query.from || req.query.to) {
    const from = req.query.from ? parseDay(String(req.query.from)) : startOfToday();
    const to = req.query.to ? parseDay(String(req.query.to), true) : new Date();
    return { from, to };
  }
  if (fallback === 'month') {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  return { from: startOfToday(), to: new Date() };
}

function sessionUrgency(
  expectedEndAt: Date,
  thresholds: { endingSoonMinutes: number; almostEndedMinutes: number }
): 'overdue' | 'almost_ended' | 'ending_soon' | 'normal' {
  const remainingMs = expectedEndAt.getTime() - Date.now();
  if (remainingMs <= 0) return 'overdue';
  if (remainingMs <= thresholds.almostEndedMinutes * 60 * 1000) return 'almost_ended';
  if (remainingMs <= thresholds.endingSoonMinutes * 60 * 1000) return 'ending_soon';
  return 'normal';
}

function resourceKey(resourceId: unknown): string {
  if (!resourceId) return '';
  if (typeof resourceId === 'object' && resourceId !== null && '_id' in resourceId) {
    return String((resourceId as { _id: Types.ObjectId })._id);
  }
  return String(resourceId);
}

router.get(
  '/dashboard',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const now = new Date();
    const settings = await getSettings();

    const [todayBills, activeEntries, resources, sessionsToday, dueBookings] =
      await Promise.all([
        Bill.find({ paymentStatus: 'paid', paidAt: { $gte: todayStart } }),
        GamingEntry.find({ status: 'active' })
          .populate('resourceId', 'name code')
          .populate('gamingOptionId', 'name'),
        GamingResource.find({ isActive: true }).select('name code').sort({ sortOrder: 1, name: 1 }),
        GamingEntry.countDocuments({
          startedAt: { $gte: todayStart, $lte: todayEnd },
          status: { $in: ['active', 'completed'] },
        }),
        Booking.countDocuments({
          scheduledStart: { $gte: todayStart, $lte: now },
          status: { $in: ['scheduled', 'confirmed'] },
        }),
      ]);

    const occupiedByResource = new Map<string, (typeof activeEntries)[number]>();
    for (const entry of activeEntries) {
      occupiedByResource.set(resourceKey(entry.resourceId), entry);
    }

    const stations = resources.map((resource) => {
      const session = occupiedByResource.get(String(resource._id));
      const urgency = session ? sessionUrgency(session.expectedEndAt, settings.sessionWarningThresholds) : null;
      return {
        id: String(resource._id),
        name: resource.name,
        code: resource.code,
        occupied: Boolean(session),
        customerName: session?.customerName,
        expectedEndAt: session?.expectedEndAt,
        urgency,
      };
    });

    const occupied = stations.filter((s) => s.occupied).length;
    const overdue = stations.filter((s) => s.urgency === 'overdue').length;
    const endingSoon = stations.filter(
      (s) => s.urgency === 'ending_soon' || s.urgency === 'almost_ended'
    ).length;

    res.json({
      today: {
        revenue: todayBills.reduce((sum, b) => sum + b.total, 0),
        billsPaid: todayBills.length,
        activeSessions: activeEntries.length,
        sessions: sessionsToday,
      },
      occupancy: {
        total: stations.length,
        occupied,
        free: Math.max(0, stations.length - occupied),
        stations,
      },
      attention: {
        overdue,
        endingSoon,
        dueBookings,
      },
    });
  })
);

router.get(
  '/overview',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = getDateRange(req, 'month');
    const useMonthly = rangeUsesMonthly(from, to);
    const chartFormat = useMonthly ? '%Y-%m' : '%Y-%m-%d';
    const durationMs = Math.max(to.getTime() - from.getTime(), 0);
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);

    const paidMatch = { paymentStatus: 'paid' as const, paidAt: { $gte: from, $lte: to } };
    const prevPaidMatch = { paymentStatus: 'paid' as const, paidAt: { $gte: prevFrom, $lte: prevTo } };

    const [
      revenueRows,
      prevRevenueRows,
      dailyRevenue,
      dailySessions,
      sessions,
      byOption,
      productRows,
      paymentRows,
      topCustomerRows,
      identifiedSpendRows,
      totalCustomers,
      newCustomers,
      uniqueCustomerIds,
    ] = await Promise.all([
      Bill.aggregate<{
        totalRevenue: number;
        billCount: number;
        gamingRevenue: number;
        productRevenue: number;
      }>([
        { $match: paidMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            billCount: { $sum: 1 },
            gamingRevenue: {
              $sum: {
                $reduce: {
                  input: {
                    $filter: { input: '$items', as: 'item', cond: { $eq: ['$$item.type', 'gaming'] } },
                  },
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.total'] },
                },
              },
            },
            productRevenue: {
              $sum: {
                $reduce: {
                  input: {
                    $filter: {
                      input: '$items',
                      as: 'item',
                      cond: { $in: ['$$item.type', ['product', 'combo']] },
                    },
                  },
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.total'] },
                },
              },
            },
          },
        },
      ]),
      useMonthly
        ? Promise.resolve([] as { totalRevenue: number }[])
        : Bill.aggregate<{ totalRevenue: number }>([
            { $match: prevPaidMatch },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
          ]),
      Bill.aggregate<{ _id: string; revenue: number; bills: number }>([
        { $match: paidMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: chartFormat, date: '$paidAt', timezone: 'Asia/Kolkata' },
            },
            revenue: { $sum: '$total' },
            bills: { $sum: 1 },
          },
        },
      ]),
      GamingEntry.aggregate<{ _id: string; sessions: number }>([
        { $match: { startedAt: { $gte: from, $lte: to }, status: { $in: ['completed', 'active'] } } },
        {
          $group: {
            _id: { $dateToString: { format: chartFormat, date: '$startedAt', timezone: 'Asia/Kolkata' } },
            sessions: { $sum: 1 },
          },
        },
      ]),
      GamingEntry.find({
        startedAt: { $gte: from, $lte: to },
        status: { $in: ['completed', 'active'] },
      }).select('actualDurationMinutes durationMinutes'),
      GamingEntry.aggregate<{ name: string; count: number; totalMinutes: number }>([
        { $match: { startedAt: { $gte: from, $lte: to }, status: { $in: ['completed', 'active'] } } },
        {
          $group: {
            _id: '$gamingOptionId',
            count: { $sum: 1 },
            totalMinutes: { $sum: { $ifNull: ['$actualDurationMinutes', '$durationMinutes'] } },
          },
        },
        { $lookup: { from: 'gamingoptions', localField: '_id', foreignField: '_id', as: 'option' } },
        { $unwind: '$option' },
        { $project: { name: '$option.name', count: 1, totalMinutes: 1 } },
        { $sort: { count: -1 } },
      ]),
      Bill.aggregate<{ name: string; type: string; revenue: number; quantity: number }>([
        { $match: paidMatch },
        { $unwind: '$items' },
        { $match: { 'items.type': { $in: ['product', 'combo'] } } },
        {
          $group: {
            _id: { type: '$items.type', name: '$items.name' },
            revenue: { $sum: '$items.total' },
            quantity: { $sum: '$items.quantity' },
          },
        },
        { $project: { _id: 0, name: '$_id.name', type: '$_id.type', revenue: 1, quantity: 1 } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),
      Bill.aggregate<{ method: string; total: number; count: number }>([
        { $match: paidMatch },
        {
          $addFields: {
            normalizedMethod: {
              $cond: [{ $in: ['$paymentMethod', ['cash', 'upi']] }, '$paymentMethod', 'upi'],
            },
          },
        },
        {
          $group: {
            _id: '$normalizedMethod',
            total: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, method: '$_id', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Bill.aggregate<{ name: string; phone?: string; spend: number; bills: number }>([
        { $match: { ...paidMatch, customerId: { $ne: null } } },
        {
          $group: {
            _id: '$customerId',
            spend: { $sum: '$total' },
            bills: { $sum: 1 },
            name: { $last: '$customerName' },
            phone: { $last: '$customerPhone' },
          },
        },
        { $sort: { spend: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ['$name', 'Customer'] },
            phone: 1,
            spend: 1,
            bills: 1,
          },
        },
      ]),
      Bill.aggregate<{ total: number }>([
        { $match: { ...paidMatch, customerId: { $ne: null } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      Bill.distinct('customerId', { ...paidMatch, customerId: { $ne: null } }),
    ]);

    const revenue = revenueRows[0] || {
      totalRevenue: 0,
      billCount: 0,
      gamingRevenue: 0,
      productRevenue: 0,
    };
    const previousTotal = useMonthly ? 0 : prevRevenueRows[0]?.totalRevenue || 0;
    const changePercent = useMonthly
      ? null
      : previousTotal === 0
        ? revenue.totalRevenue === 0
          ? 0
          : null
        : Math.round(((revenue.totalRevenue - previousTotal) / previousTotal) * 1000) / 10;

    const revenueByDay = new Map(dailyRevenue.map((row) => [row._id, row]));
    const sessionsByDay = new Map(dailySessions.map((row) => [row._id, row.sessions]));
    const chartDates = useMonthly ? eachMonth(from, to) : eachDay(from, to);
    const daily = chartDates.map((date) => ({
      date,
      revenue: revenueByDay.get(date)?.revenue || 0,
      sessions: sessionsByDay.get(date) || 0,
    }));

    const totalMinutes = sessions.reduce(
      (sum, s) => sum + (s.actualDurationMinutes || s.durationMinutes || 0),
      0
    );
    const uniqueCustomers = uniqueCustomerIds.filter(Boolean);
    const returning = uniqueCustomers.length
      ? await Customer.countDocuments({ _id: { $in: uniqueCustomers }, createdAt: { $lt: from } })
      : 0;

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      revenue: {
        total: revenue.totalRevenue,
        gaming: revenue.gamingRevenue,
        products: revenue.productRevenue,
        billCount: revenue.billCount,
        avgBill: revenue.billCount ? Math.round(revenue.totalRevenue / revenue.billCount) : 0,
      },
      comparison: {
        previousTotal,
        changePercent,
      },
      daily,
      gaming: {
        sessionCount: sessions.length,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgDurationMinutes: sessions.length ? Math.round(totalMinutes / sessions.length) : 0,
        byOption: byOption.map((opt) => ({
          name: opt.name,
          count: opt.count,
          hours: Math.round((opt.totalMinutes / 60) * 10) / 10,
        })),
      },
      customers: {
        total: totalCustomers,
        newInPeriod: newCustomers,
        returning,
        avgSpend: uniqueCustomers.length
          ? Math.round((identifiedSpendRows[0]?.total || 0) / uniqueCustomers.length)
          : 0,
        top: topCustomerRows,
      },
      products: productRows,
      payments: paymentRows,
    });
  })
);

router.get(
  '/revenue',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = getDateRange(req);

    const result = await Bill.aggregate([
      { $match: { paymentStatus: 'paid', paidAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          billCount: { $sum: 1 },
          gamingRevenue: {
            $sum: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$items',
                    as: 'item',
                    cond: { $eq: ['$$item.type', 'gaming'] },
                  },
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.total'] },
              },
            },
          },
        },
      },
    ]);

    res.json(result[0] || { totalRevenue: 0, billCount: 0, gamingRevenue: 0 });
  })
);

router.get(
  '/gaming',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = getDateRange(req);

    const sessions = await GamingEntry.find({
      startedAt: { $gte: from, $lte: to },
      status: { $in: ['completed', 'active'] },
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualDurationMinutes || s.durationMinutes), 0);

    const byOption = await GamingEntry.aggregate([
      { $match: { startedAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$gamingOptionId', count: { $sum: 1 }, totalMinutes: { $sum: '$durationMinutes' } } },
      { $lookup: { from: 'gamingoptions', localField: '_id', foreignField: '_id', as: 'option' } },
      { $unwind: '$option' },
      { $project: { name: '$option.name', count: 1, totalMinutes: 1 } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      sessionCount: sessions.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      byOption,
    });
  })
);

router.get(
  '/customers',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = getDateRange(req);

    const [totalCustomers, newCustomers, topCustomers, activeMemberships] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      Customer.find().sort({ totalSpending: -1 }).limit(10).select('name phone totalSpending totalVisits'),
      CustomerMembership.countDocuments({ status: 'active', expiryDate: { $gte: new Date() } }),
    ]);

    res.json({ totalCustomers, newCustomers, topCustomers, activeMemberships });
  })
);

router.get(
  '/products',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = getDateRange(req);

    const result = await Bill.aggregate([
      { $match: { paymentStatus: 'paid', paidAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      { $match: { 'items.type': { $in: ['product', 'combo'] } } },
      {
        $group: {
          _id: { type: '$items.type', name: '$items.name' },
          revenue: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);

    res.json(result);
  })
);

export default router;
