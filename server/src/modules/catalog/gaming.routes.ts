import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GamingOption, GamingResource } from '../../models/GamingOption';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';
import { slugify } from '../../utils/helpers';

const router = Router();

const createOptionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  supportsPlayerPricing: z.boolean().optional(),
  minPlayers: z.number().min(1).optional(),
  maxPlayers: z.number().min(1).optional(),
  minDurationMinutes: z.number().min(1).optional(),
  sortOrder: z.number().optional(),
  membershipDiscountPercent: z.number().min(0).max(100).optional(),
});

const updateOptionSchema = createOptionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.active !== 'false';
    const filter = activeOnly ? { isActive: true } : {};
    const options = await GamingOption.find(filter).sort({ sortOrder: 1, name: 1 });
    res.json(options);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const option = await GamingOption.findById(req.params.id);
    if (!option) throw new AppError(404, 'Gaming option not found');
    res.json(option);
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createOptionSchema.parse(req.body);
    const slug = slugify(data.name);
    const existing = await GamingOption.findOne({ slug });
    if (existing) throw new AppError(409, 'Gaming option with this name already exists');

    const isPc = /pc|rtx/i.test(data.name);
    const membershipDiscountPercent =
      data.membershipDiscountPercent ?? (isPc ? 10 : 0);

    const option = await GamingOption.create({ ...data, slug, membershipDiscountPercent });
    res.status(201).json(option);
  })
);

router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateOptionSchema.parse(req.body);
    if (data.name) {
      (data as Record<string, unknown>).slug = slugify(data.name);
    }
    const option = await GamingOption.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!option) throw new AppError(404, 'Gaming option not found');
    res.json(option);
  })
);

export default router;

// Gaming Resources routes
export const resourcesRouter = Router();

const createResourceSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  supportedOptionIds: z.array(z.string()).min(1),
  capabilities: z
    .object({
      gpu: z.string().optional(),
      hasDrivingSetup: z.boolean().optional(),
      hasVR: z.boolean().optional(),
    })
    .optional(),
  bufferMinutes: z.number().min(0).optional(),
  sortOrder: z.number().optional(),
});

const updateResourceSchema = createResourceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

resourcesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.active !== 'false';
    const filter = activeOnly ? { isActive: true } : {};
    const resources = await GamingResource.find(filter)
      .populate('supportedOptionIds', 'name slug')
      .sort({ sortOrder: 1, name: 1 });
    res.json(resources);
  })
);

resourcesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const resource = await GamingResource.findById(req.params.id).populate(
      'supportedOptionIds',
      'name slug'
    );
    if (!resource) throw new AppError(404, 'Gaming resource not found');
    res.json(resource);
  })
);

resourcesRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createResourceSchema.parse(req.body);
    const existing = await GamingResource.findOne({ code: data.code.toUpperCase() });
    if (existing) throw new AppError(409, 'Resource code already exists');

    const resource = await GamingResource.create({
      ...data,
      code: data.code.toUpperCase(),
    });
    res.status(201).json(resource);
  })
);

resourcesRouter.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateResourceSchema.parse(req.body);
    if (data.code) data.code = data.code.toUpperCase();
    const resource = await GamingResource.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!resource) throw new AppError(404, 'Gaming resource not found');
    res.json(resource);
  })
);
