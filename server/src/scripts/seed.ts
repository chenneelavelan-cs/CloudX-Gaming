import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { config } from '../config';
import { User } from '../models/User';
import { Settings } from '../models/Settings';
import { GamingOption, GamingResource } from '../models/GamingOption';
import { PricingTier } from '../models/PricingTier';
import { Product, Combo } from '../models/Product';
import { MembershipPlan } from '../models/Membership';
import { Bill } from '../models/Bill';
import { slugify } from '../utils/helpers';

dotenv.config();

async function upsertPricingTiers(
  gamingOptionId: string,
  tiers: Array<{ playerCount?: number; durationMinutes: number; price: number; label: string }>
) {
  await PricingTier.deleteMany({ gamingOptionId });
  for (const tier of tiers) {
    await PricingTier.create({
      gamingOptionId,
      playerCount: tier.playerCount,
      durationMinutes: tier.durationMinutes,
      price: tier.price,
      label: tier.label,
      isActive: true,
    });
  }
}

async function seed() {
  await connectDatabase();
  console.log('Seeding CloudX Gaming Hub database...');

  const existingAdmin = await User.findOne({ email: config.adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(config.adminPassword, 10);
    await User.create({
      email: config.adminEmail,
      passwordHash,
      name: config.adminName,
    });
    console.log(`Created admin: ${config.adminEmail}`);
  }

  await Settings.findOneAndUpdate(
    { key: 'global' },
    {
      businessName: 'CloudX Gaming Hub',
      timezone: 'Asia/Kolkata',
      sessionExtensionOptions: [30, 60],
    },
    { upsert: true }
  );

  // ─── Gaming options (from hub pricing posters) ───────────────────────────
  const optionsData = [
    {
      name: 'PS5',
      description: 'PS5 · 55" 120Hz · per head / per hour',
      supportsPlayerPricing: true,
      membershipDiscountPercent: 0,
      minPlayers: 1,
      maxPlayers: 4,
      minDurationMinutes: 60,
      sortOrder: 1,
    },
    {
      name: 'PS2',
      description: 'PS2 · 43" 60Hz · 200+ games · per head / per hour',
      supportsPlayerPricing: true,
      membershipDiscountPercent: 0,
      minPlayers: 1,
      maxPlayers: 5,
      minDurationMinutes: 60,
      sortOrder: 2,
    },
    {
      name: 'PC RTX 4060',
      description: 'RTX 4060 · 27" 280Hz',
      supportsPlayerPricing: false,
      membershipDiscountPercent: 10,
      minDurationMinutes: 60,
      sortOrder: 3,
    },
    {
      name: 'PC RTX 3060',
      description: 'RTX 3060 · 27" 180Hz',
      supportsPlayerPricing: false,
      membershipDiscountPercent: 10,
      minDurationMinutes: 60,
      sortOrder: 4,
    },
    {
      name: 'VR',
      description: 'PlayStation VR2 · Horizon, Gran Turismo 7, RE Village & more',
      supportsPlayerPricing: false,
      membershipDiscountPercent: 0,
      minDurationMinutes: 15,
      sortOrder: 5,
    },
    {
      name: 'Driving Setup',
      description: 'Logitech G29 · Forza Horizon, Euro Truck Simulator 2',
      supportsPlayerPricing: false,
      membershipDiscountPercent: 0,
      minDurationMinutes: 30,
      sortOrder: 6,
    },
  ];

  const options: Record<string, string> = {};
  for (const opt of optionsData) {
    const slug = slugify(opt.name);
    const doc = await GamingOption.findOneAndUpdate(
      { slug },
      { ...opt, slug, isActive: true },
      { upsert: true, new: true }
    );
    options[opt.name] = doc!._id.toString();
  }

  await GamingOption.updateMany(
    { slug: { $in: ['pc-rtx-4060', 'pc-rtx-3060'] } },
    { $set: { membershipDiscountPercent: 10 } }
  );

  // ─── Resources ───────────────────────────────────────────────────────────
  const resourcesData = [
    {
      name: 'TV-001',
      code: 'TV-001',
      description: 'Multi-mode · PS2 & VR also available',
      options: ['PS5', 'PS2', 'VR'],
      capabilities: { hasVR: true },
      sortOrder: 1,
    },
    {
      name: 'TV-002',
      code: 'TV-002',
      description: 'PS5 on shared TV',
      options: ['PS5'],
      sortOrder: 2,
    },
    {
      name: 'TV-003',
      code: 'TV-003',
      description: 'PS5 on shared TV',
      options: ['PS5'],
      sortOrder: 3,
    },
    {
      name: 'TV-004',
      code: 'TV-004',
      description: 'PS5 on shared TV',
      options: ['PS5'],
      sortOrder: 4,
    },
    {
      name: 'PS5-001',
      code: 'PS5-001',
      description: 'Dedicated PS5 console',
      options: ['PS5'],
      sortOrder: 5,
    },
    {
      name: 'PS5-002',
      code: 'PS5-002',
      description: 'Dedicated PS5 console',
      options: ['PS5'],
      sortOrder: 6,
    },
    {
      name: 'PS5-003',
      code: 'PS5-003',
      description: 'Dedicated PS5 console',
      options: ['PS5'],
      sortOrder: 7,
    },
    {
      name: 'PS5-004',
      code: 'PS5-004',
      description: 'Dedicated PS5 console',
      options: ['PS5'],
      sortOrder: 8,
    },
    {
      name: 'PS2-001',
      code: 'PS2-001',
      description: 'Dedicated PS2 console',
      options: ['PS2'],
      sortOrder: 9,
    },
    {
      name: 'PC-001 RTX 4060',
      code: 'PC-001',
      description: 'RTX 4060 gaming PC',
      options: ['PC RTX 4060'],
      capabilities: { gpu: 'RTX 4060' },
      sortOrder: 10,
    },
    {
      name: 'PC-002 RTX 4060 + Driving',
      code: 'PC-002',
      description: 'RTX 4060 · includes driving rig',
      options: ['PC RTX 4060', 'Driving Setup'],
      capabilities: { gpu: 'RTX 4060', hasDrivingSetup: true },
      sortOrder: 11,
    },
    {
      name: 'PC-003 RTX 3060',
      code: 'PC-003',
      description: 'RTX 3060 gaming PC',
      options: ['PC RTX 3060'],
      capabilities: { gpu: 'RTX 3060' },
      sortOrder: 12,
    },
    {
      name: 'PC-004 RTX 3060',
      code: 'PC-004',
      description: 'RTX 3060 gaming PC',
      options: ['PC RTX 3060'],
      capabilities: { gpu: 'RTX 3060' },
      sortOrder: 13,
    },
    {
      name: 'VR-001',
      code: 'VR-001',
      description: 'VR headset setup',
      options: ['VR'],
      capabilities: { hasVR: true },
      sortOrder: 14,
    },
    {
      name: 'WHEEL-001 G29',
      code: 'WHEEL-001',
      description: 'Logitech G29 steering wheel',
      options: ['Driving Setup'],
      capabilities: { hasDrivingSetup: true },
      sortOrder: 15,
    },
  ];

  for (const res of resourcesData) {
    await GamingResource.findOneAndUpdate(
      { code: res.code },
      {
        name: res.name,
        code: res.code,
        description: (res as { description?: string }).description,
        supportedOptionIds: res.options.map((o) => options[o]),
        capabilities: res.capabilities,
        sortOrder: res.sortOrder,
        isActive: true,
      },
      { upsert: true }
    );
  }

  // ─── PS5 pricing (offer · ₹/head/hr — total = rate × players × hours) ───
  // Standard: 130 / 110 / 100 / 90  →  Offer: 120 / 90 / 80 / 70
  await upsertPricingTiers(options['PS5'], [
    { playerCount: 1, durationMinutes: 60, price: 120, label: '₹120/head/hr · 1P (offer, std ₹130)' },
    { playerCount: 2, durationMinutes: 60, price: 90, label: '₹90/head/hr · 2P (offer, std ₹110)' },
    { playerCount: 3, durationMinutes: 60, price: 80, label: '₹80/head/hr · 3P (offer, std ₹100)' },
    { playerCount: 4, durationMinutes: 60, price: 70, label: '₹70/head/hr · 4P (offer, std ₹90)' },
  ]);

  // ─── PS2 pricing (₹/head/hr) ─────────────────────────────────────────────
  await upsertPricingTiers(options['PS2'], [
    { playerCount: 1, durationMinutes: 60, price: 100, label: '₹100/head/hr · 1 player' },
    { playerCount: 2, durationMinutes: 60, price: 70, label: '₹70/head/hr · 2 players' },
    { playerCount: 3, durationMinutes: 60, price: 60, label: '₹60/head/hr · 3 players' },
    { playerCount: 4, durationMinutes: 60, price: 50, label: '₹50/head/hr · 4 players' },
    { playerCount: 5, durationMinutes: 60, price: 50, label: '₹50/head/hr · 5 players' },
  ]);

  // ─── PC RTX 4060 (hub standard rates; members see discounted rates) ──────
  await upsertPricingTiers(options['PC RTX 4060'], [
    { durationMinutes: 60, price: 90, label: '1 Hour' },
    { durationMinutes: 180, price: 240, label: '3 Hours' },
    { durationMinutes: 300, price: 390, label: '5 Hours' },
    { durationMinutes: 1440, price: 650, label: '1 Day' },
  ]);

  // ─── PC RTX 3060 ─────────────────────────────────────────────────────────
  await upsertPricingTiers(options['PC RTX 3060'], [
    { durationMinutes: 60, price: 70, label: '1 Hour' },
    { durationMinutes: 180, price: 180, label: '3 Hours' },
    { durationMinutes: 300, price: 290, label: '5 Hours' },
    { durationMinutes: 1440, price: 500, label: '1 Day' },
  ]);

  // ─── PlayStation VR2 ─────────────────────────────────────────────────────
  await upsertPricingTiers(options['VR'], [
    { durationMinutes: 15, price: 60, label: '15 min' },
    { durationMinutes: 30, price: 100, label: '30 min' },
  ]);

  // ─── Driving wheel G29 (offer rates) ─────────────────────────────────────
  // Standard: 90/170/300 → Offer: 75/140/250
  await upsertPricingTiers(options['Driving Setup'], [
    { durationMinutes: 30, price: 75, label: '30 min (offer)' },
    { durationMinutes: 60, price: 140, label: '1 Hour (offer)' },
    { durationMinutes: 120, price: 250, label: '2 Hours (offer)' },
  ]);

  // ─── CloudX Cafe menu (products) ─────────────────────────────────────────
  await Product.deleteMany({});
  await Combo.deleteMany({});

  type ProductSeed = {
    name: string;
    category: 'food' | 'drink' | 'other';
    price: number;
    description?: string;
    mustTry?: boolean;
    sortOrder: number;
  };

  const productsData: ProductSeed[] = [
    // Drinks
    { name: 'Pepsi', category: 'drink', price: 40, sortOrder: 1 },
    { name: 'Coke', category: 'drink', price: 40, sortOrder: 2 },
    { name: 'Rose Bliss', category: 'drink', price: 40, mustTry: true, sortOrder: 3 },
    { name: 'Badam Bliss', category: 'drink', price: 40, mustTry: true, sortOrder: 4 },
    { name: 'Goli Soda', category: 'drink', price: 40, sortOrder: 5 },
    { name: 'Cold Choco', category: 'drink', price: 79, sortOrder: 6 },
    { name: 'Cold Boost', category: 'drink', price: 69, sortOrder: 7 },
    { name: 'Cold Coffee', category: 'drink', price: 69, sortOrder: 8 },

    // Mojito
    { name: 'Mint Mojito', category: 'drink', price: 69, sortOrder: 10 },
    { name: 'Blueberry Mojito', category: 'drink', price: 79, mustTry: true, sortOrder: 11 },
    { name: 'Strawberry Mojito', category: 'drink', price: 79, sortOrder: 12 },

    // Shakes
    { name: 'Chocolate Shake', category: 'drink', price: 89, mustTry: true, sortOrder: 20 },
    { name: 'Butterscotch Shake', category: 'drink', price: 89, sortOrder: 21 },
    { name: 'Strawberry Shake', category: 'drink', price: 89, mustTry: true, sortOrder: 22 },
    { name: 'Vanilla Shake', category: 'drink', price: 79, sortOrder: 23 },

    // Appetizers
    { name: 'French Fry', category: 'food', price: 79, sortOrder: 30 },
    { name: 'Peri Peri Fries', category: 'food', price: 89, mustTry: true, sortOrder: 31 },
    { name: 'Cheesecorn Nugget', category: 'food', price: 89, sortOrder: 32 },
    { name: 'Chicken Nugget', category: 'food', price: 89, sortOrder: 33 },
    { name: 'Veg Momo', category: 'food', price: 79, description: 'Fried momo only', sortOrder: 34 },
    { name: 'Chicken Momo', category: 'food', price: 89, mustTry: true, description: 'Fried momo only', sortOrder: 35 },
    { name: 'Paneer Momo', category: 'food', price: 89, description: 'Fried momo only', sortOrder: 36 },
    { name: 'Cheese Balls', category: 'food', price: 79, sortOrder: 37 },
    { name: 'Veg Roll', category: 'food', price: 79, sortOrder: 38 },
    { name: 'Chicken Roll', category: 'food', price: 89, mustTry: true, sortOrder: 39 },

    // Burgers
    { name: 'Veg Burger', category: 'food', price: 79, sortOrder: 40 },
    { name: 'Paneer Burger', category: 'food', price: 89, sortOrder: 41 },
    { name: 'Chicken Burger', category: 'food', price: 99, mustTry: true, sortOrder: 42 },

    // Waffles
    { name: 'White Choco Waffle', category: 'food', price: 89, sortOrder: 50 },
    { name: 'Dark Choco Waffle', category: 'food', price: 89, sortOrder: 51 },
    { name: 'Double Choco Waffle', category: 'food', price: 99, sortOrder: 52 },
    { name: 'Triple Choco Waffle', category: 'food', price: 99, mustTry: true, sortOrder: 53 },
    { name: 'Oreo Waffle', category: 'food', price: 99, mustTry: true, sortOrder: 54 },
    { name: 'KitKat Waffle', category: 'food', price: 99, sortOrder: 55 },
    { name: 'Tower Waffle', category: 'food', price: 179, sortOrder: 56 },

    // Ice cream (2–3 scoops)
    { name: 'Vanilla Ice Cream', category: 'food', price: 59, description: '2–3 scoops', sortOrder: 60 },
    { name: 'Strawberry Ice Cream', category: 'food', price: 69, mustTry: true, description: '2–3 scoops', sortOrder: 61 },
    { name: 'Butterscotch Ice Cream', category: 'food', price: 69, description: '2–3 scoops', sortOrder: 62 },
    { name: 'Chocolate Ice Cream', category: 'food', price: 69, mustTry: true, description: '2–3 scoops', sortOrder: 63 },
    { name: 'Choco Berry Ice Cream', category: 'food', price: 79, description: '2–3 scoops', sortOrder: 64 },
    { name: 'Rosy Vanilla Ice Cream', category: 'food', price: 79, mustTry: true, description: '2–3 scoops', sortOrder: 65 },
    { name: 'Bliss Overload Ice Cream', category: 'food', price: 89, mustTry: true, description: '2–3 scoops', sortOrder: 66 },

    // Add-ons
    { name: 'Extra Ice Cream Scoop', category: 'other', price: 30, sortOrder: 70 },
    { name: 'Extra Ice Cream (Waffle)', category: 'other', price: 30, sortOrder: 71 },
  ];

  const productIds: Record<string, string> = {};
  for (const p of productsData) {
    const doc = await Product.create({ ...p, isActive: true });
    productIds[p.name] = doc._id.toString();
  }

  // ─── Cafe combos ─────────────────────────────────────────────────────────
  const combosData = [
    {
      name: 'Combo 1',
      description: 'Mojito + Peri Peri Fries · Must try',
      price: 159,
      items: [
        { product: 'Blueberry Mojito', qty: 1 },
        { product: 'Peri Peri Fries', qty: 1 },
      ],
    },
    {
      name: 'Combo 2',
      description: 'Mojito + Burger · Must try',
      price: 179,
      items: [
        { product: 'Blueberry Mojito', qty: 1 },
        { product: 'Chicken Burger', qty: 1 },
      ],
    },
    {
      name: 'Combo 3',
      description: 'Mojito + Nuggets',
      price: 169,
      items: [
        { product: 'Mint Mojito', qty: 1 },
        { product: 'Chicken Nugget', qty: 1 },
      ],
    },
    {
      name: 'Combo 4',
      description: 'Mojito + Roll/Momo',
      price: 169,
      items: [
        { product: 'Strawberry Mojito', qty: 1 },
        { product: 'Chicken Roll', qty: 1 },
      ],
    },
    {
      name: 'Combo 5',
      description: 'Waffle + Fries',
      price: 179,
      items: [
        { product: 'Oreo Waffle', qty: 1 },
        { product: 'French Fry', qty: 1 },
      ],
    },
    {
      name: 'Combo 6',
      description: 'Waffle + Fries + Ice Cream · Must try',
      price: 259,
      items: [
        { product: 'Triple Choco Waffle', qty: 1 },
        { product: 'Peri Peri Fries', qty: 1 },
        { product: 'Chocolate Ice Cream', qty: 1 },
      ],
    },
    {
      name: 'Combo 7',
      description: 'Waffle + Burger + Mojito',
      price: 269,
      items: [
        { product: 'KitKat Waffle', qty: 1 },
        { product: 'Paneer Burger', qty: 1 },
        { product: 'Blueberry Mojito', qty: 1 },
      ],
    },
  ];

  for (const combo of combosData) {
    await Combo.create({
      name: combo.name,
      description: combo.description,
      mustTry: combo.description.toLowerCase().includes('must try'),
      price: combo.price,
      items: combo.items.map((i) => ({
        productId: productIds[i.product],
        quantity: i.qty,
      })),
      isActive: true,
    });
  }

  // ─── PC membership plans (member rates from posters) ─────────────────────
  const pc4060Id = options['PC RTX 4060'];
  const pc3060Id = options['PC RTX 3060'];

  await MembershipPlan.findOneAndUpdate(
    { name: 'PC RTX 4060 Member' },
    {
      name: 'PC RTX 4060 Member',
      description: 'Member rates: ₹75/hr · ₹210/3hr · ₹350/5hr · ₹600/day',
      durationDays: 365,
      price: 2000,
      discountRules: [
        {
          gamingOptionId: pc4060Id,
          discountType: 'percentage',
          discountValue: 13,
        },
      ],
      isActive: true,
    },
    { upsert: true }
  );

  await MembershipPlan.findOneAndUpdate(
    { name: 'PC RTX 3060 Member' },
    {
      name: 'PC RTX 3060 Member',
      description: 'Member rates: ₹60/hr · ₹160/3hr · ₹260/5hr · ₹460/day',
      durationDays: 365,
      price: 1500,
      discountRules: [
        {
          gamingOptionId: pc3060Id,
          discountType: 'percentage',
          discountValue: 12,
        },
      ],
      isActive: true,
    },
    { upsert: true }
  );

  // Remove legacy membership plan name if present
  await MembershipPlan.deleteOne({ name: 'PC Member' });

  const cardMigrated = await Bill.updateMany({ paymentMethod: 'card' }, { $set: { paymentMethod: 'upi' } });
  if (cardMigrated.modifiedCount) {
    console.log(`  Migrated ${cardMigrated.modifiedCount} card payment(s) to UPI`);
  }

  await Combo.updateMany(
    { description: { $regex: /must try/i } },
    { $set: { mustTry: true } }
  );

  console.log('Seed completed successfully!');
  console.log(`  Gaming options: ${optionsData.length}`);
  console.log(`  Products: ${productsData.length}`);
  console.log(`  Combos: ${combosData.length}`);

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
