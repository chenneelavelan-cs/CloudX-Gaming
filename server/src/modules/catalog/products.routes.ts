import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Product, Combo } from '../../models/Product';
import { asyncHandler, AppError } from '../../utils/errors';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

const categorySchema = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase() || 'other');

const createProductSchema = z.object({
  name: z.string().min(1).trim(),
  category: categorySchema.optional().default('other'),
  description: z.string().trim().optional(),
  mustTry: z.boolean().optional(),
  price: z.number().min(0),
  sortOrder: z.number().optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.active !== 'false';
    const filter: Record<string, unknown> = activeOnly ? { isActive: true } : {};
    if (req.query.category) filter.category = req.query.category;

    const products = await Product.find(filter).sort({ sortOrder: 1, name: 1 });
    res.json(products);
  })
);

router.get(
  '/groups',
  asyncHandler(async (_req: Request, res: Response) => {
    const groups = await Product.distinct('category', { isActive: true });
    res.json(groups.sort());
  })
);

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);
    const product = await Product.create(data);
    res.status(201).json(product);
  })
);

router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateProductSchema.parse(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!product) throw new AppError(404, 'Product not found');
    res.json(product);
  })
);

// Combos
const createComboSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  mustTry: z.boolean().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  price: z.number().min(0),
});

export const combosRouter = Router();

combosRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.active !== 'false';
    const filter = activeOnly ? { isActive: true } : {};
    const combos = await Combo.find(filter).populate('items.productId', 'name price category');
    res.json(combos);
  })
);

combosRouter.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createComboSchema.parse(req.body);
    const combo = await Combo.create(data);
    res.status(201).json(combo);
  })
);

combosRouter.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createComboSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const combo = await Combo.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!combo) throw new AppError(404, 'Combo not found');
    res.json(combo);
  })
);

export default router;
