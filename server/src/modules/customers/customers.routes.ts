import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../../models/Customer';
import { Booking } from '../../models/Booking';
import { GamingEntry } from '../../models/GamingEntry';
import { Bill } from '../../models/Bill';
import '../../models/GamingOption';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';
import { parsePagination, paginatedResult } from '../../utils/pagination';
import { buildCustomerSearchFilter } from '../../utils/customer-search';
import { CustomerMembership } from '../../models/Membership';

const router = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const phone = req.query.phone as string;
    const membership = req.query.membership as string | undefined;

    let filter: Record<string, unknown> = {};
    if (phone) {
      filter.phone = { $regex: phone, $options: 'i' };
    } else if (q) {
      filter = buildCustomerSearchFilter(q);
    }

    if (membership === 'active' || membership === 'none') {
      const activeMemberships = await CustomerMembership.find({
        status: 'active',
        expiryDate: { $gte: new Date() },
      }).select('customerId');
      const memberIds = activeMemberships.map((m) => m.customerId);

      if (membership === 'active') {
        filter._id = { $in: memberIds };
      } else if (memberIds.length) {
        filter._id = { ...(filter._id as object), $nin: memberIds };
      }
    }

    const pagination = parsePagination(req);
    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ totalVisits: -1, lastVisitAt: -1, name: 1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Customer.countDocuments(filter),
    ]);

    const customerIds = customers.map((c) => c._id);
    const memberships = await CustomerMembership.find({
      customerId: { $in: customerIds },
      status: 'active',
      expiryDate: { $gte: new Date() },
    }).populate('planId', 'name');

    const membershipByCustomer = new Map(
      memberships.map((m) => [m.customerId.toString(), m])
    );

    const enriched = customers.map((c) => {
      const activeMembership = membershipByCustomer.get(c._id.toString());
      return {
        ...c.toObject(),
        activeMembership: activeMembership
          ? {
              _id: activeMembership._id,
              planName: (activeMembership.planId as unknown as { name: string }).name,
              expiryDate: activeMembership.expiryDate,
            }
          : null,
      };
    });

    res.json(paginatedResult(enriched, total, pagination));
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new AppError(404, 'Customer not found');
    res.json(customer);
  })
);

router.get(
  '/:id/history',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError(404, 'Customer not found');

    const linkedFilter = {
      $or: [
        { customerId },
        { customerName: customer.name, customerPhone: customer.phone },
      ],
    };
    const gamingFilter = { $or: [{ customerId }, { customerName: customer.name }] };
    const billFilter = { $or: [{ customerId }, { customerName: customer.name }] };

    const [bookings, gamingEntries, bills, bookingCount, gamingCount, billCount] = await Promise.all([
      Booking.find(linkedFilter)
        .populate('gamingOptionId', 'name')
        .populate('resourceId', 'name code')
        .sort({ scheduledStart: -1 })
        .limit(5),
      GamingEntry.find(gamingFilter)
        .populate('gamingOptionId', 'name')
        .populate('resourceId', 'name code')
        .sort({ startedAt: -1 })
        .limit(5),
      Bill.find(billFilter).sort({ createdAt: -1 }).limit(5),
      Booking.countDocuments(linkedFilter),
      GamingEntry.countDocuments(gamingFilter),
      Bill.countDocuments(billFilter),
    ]);

    res.json({
      customer,
      bookings,
      gamingEntries,
      bills,
      summary: {
        totalVisits: customer.totalVisits,
        totalSpending: customer.totalSpending,
        lastVisit: customer.lastVisitAt,
        bookingCount,
        gamingCount,
        billCount,
      },
    });
  })
);

router.get(
  '/:id/bookings',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError(404, 'Customer not found');

    const filter = {
      $or: [
        { customerId },
        { customerName: customer.name, customerPhone: customer.phone },
      ],
    };
    const pagination = parsePagination(req);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('gamingOptionId', 'name')
        .populate('resourceId', 'name code')
        .sort({ scheduledStart: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Booking.countDocuments(filter),
    ]);

    res.json(paginatedResult(bookings, total, pagination));
  })
);

router.get(
  '/:id/sessions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError(404, 'Customer not found');

    const filter = { $or: [{ customerId }, { customerName: customer.name }] };
    const pagination = parsePagination(req);

    const [gamingEntries, total] = await Promise.all([
      GamingEntry.find(filter)
        .populate('gamingOptionId', 'name')
        .populate('resourceId', 'name code')
        .sort({ startedAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      GamingEntry.countDocuments(filter),
    ]);

    res.json(paginatedResult(gamingEntries, total, pagination));
  })
);

router.get(
  '/:id/bills',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.params.id;
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError(404, 'Customer not found');

    const filter = { $or: [{ customerId }, { customerName: customer.name }] };
    const pagination = parsePagination(req);

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Bill.countDocuments(filter),
    ]);

    res.json(paginatedResult(bills, total, pagination));
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createCustomerSchema.parse(req.body);
    const existing = await Customer.findOne({ name: data.name, phone: data.phone });
    if (existing) {
      throw new AppError(409, 'Customer with this name and phone already exists', { existingId: existing._id });
    }

    const customer = await Customer.create(data);
    res.status(201).json(customer);
  })
);

router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateCustomerSchema.parse(req.body);

    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new AppError(404, 'Customer not found');

    const name = data.name ?? customer.name;
    const phone = data.phone ?? customer.phone;
    const existing = await Customer.findOne({ name, phone, _id: { $ne: req.params.id } });
    if (existing) {
      throw new AppError(409, 'Customer with this name and phone already exists', { existingId: existing._id });
    }

    const updated = await Customer.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new AppError(404, 'Customer not found');

    const [bookingCount, gamingCount, billCount] = await Promise.all([
      Booking.countDocuments({ customerId: customer._id }),
      GamingEntry.countDocuments({ customerId: customer._id }),
      Bill.countDocuments({ customerId: customer._id }),
    ]);

    if (bookingCount + gamingCount + billCount > 0) {
      throw new AppError(
        409,
        'Cannot delete customer with linked bookings, sessions, or bills. Edit the record instead.'
      );
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
