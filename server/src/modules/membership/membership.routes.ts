import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../../models/Customer';
import { CustomerMembership, MembershipPlan } from '../../models/Membership';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.get(
  '/plans',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await MembershipPlan.find({ isActive: true }).sort({ name: 1 });
    res.json(plans);
  })
);

router.get(
  '/customers/:customerId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const membership = await CustomerMembership.findOne({
      customerId: req.params.customerId,
      status: 'active',
      expiryDate: { $gte: new Date() },
    }).populate('planId', 'name description durationDays price');

    res.json(membership);
  })
);

router.post(
  '/customers/:customerId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = z.object({ planId: z.string() }).parse(req.body);

    const customer = await Customer.findById(req.params.customerId);
    if (!customer) throw new AppError(404, 'Customer not found');

    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) throw new AppError(404, 'Membership plan not found');

    await CustomerMembership.updateMany(
      { customerId: customer._id, status: 'active' },
      { status: 'cancelled' }
    );

    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    const membership = await CustomerMembership.create({
      customerId: customer._id,
      planId: plan._id,
      startDate,
      expiryDate,
      status: 'active',
    });

    const populated = await CustomerMembership.findById(membership._id).populate(
      'planId',
      'name description durationDays price'
    );

    res.status(201).json(populated);
  })
);

router.delete(
  '/customers/:customerId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const membership = await CustomerMembership.findOneAndUpdate(
      {
        customerId: req.params.customerId,
        status: 'active',
        expiryDate: { $gte: new Date() },
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!membership) throw new AppError(404, 'No active membership found');
    res.json({ success: true });
  })
);

export default router;
