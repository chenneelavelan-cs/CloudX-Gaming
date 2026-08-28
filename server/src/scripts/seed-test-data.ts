/**
 * Seeds a small set of customers, sessions, and bills for local testing.
 * All test records use phone prefix 9999 and tag "seed-test".
 *
 * Requires catalog seed first: npm run seed
 * Run: npm run seed:test-data
 */
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { config } from '../config';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { GamingOption, GamingResource } from '../models/GamingOption';
import { GamingEntry } from '../models/GamingEntry';
import { Bill, IBillItem } from '../models/Bill';
import { Booking } from '../models/Booking';
import { Product, Combo } from '../models/Product';
import { CustomerMembership, MembershipPlan } from '../models/Membership';
import { getNextBillNumber } from '../models/Settings';

dotenv.config();

const TEST_TAG = 'seed-test';
const TEST_PHONE_PREFIX = '9999';

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function cleanupPreviousTestData() {
  const testCustomers = await Customer.find({ phone: { $regex: `^${TEST_PHONE_PREFIX}` } });
  const testCustomerIds = testCustomers.map((c) => c._id);

  const testBills = await Bill.find({
    $or: [
      { customerId: { $in: testCustomerIds } },
      { customerPhone: { $regex: `^${TEST_PHONE_PREFIX}` } },
      { notes: { $regex: TEST_TAG } },
    ],
  });
  const testBillIds = testBills.map((b) => b._id);

  await CustomerMembership.deleteMany({ customerId: { $in: testCustomerIds } });
  await GamingEntry.deleteMany({
    $or: [{ customerId: { $in: testCustomerIds } }, { notes: { $regex: TEST_TAG } }, { billId: { $in: testBillIds } }],
  });
  await Booking.deleteMany({
    $or: [{ customerId: { $in: testCustomerIds } }, { referenceCode: { $regex: '^TEST-BK-' } }],
  });
  await Bill.deleteMany({ _id: { $in: testBillIds } });
  await Customer.deleteMany({ _id: { $in: testCustomerIds } });

  console.log(`  Cleared ${testCustomers.length} test customers and related data`);
}

async function requireCatalog() {
  const admin = await User.findOne({ email: config.adminEmail });
  if (!admin) throw new Error('Admin user not found. Run `npm run seed` first.');
  if ((await GamingOption.countDocuments({ isActive: true })) === 0) {
    throw new Error('Gaming options missing. Run `npm run seed` first.');
  }
  return admin;
}

async function createBill(params: {
  adminId: Types.ObjectId;
  customer?: { id: Types.ObjectId; name: string; phone: string };
  items: IBillItem[];
  linkedGamingEntryIds?: Types.ObjectId[];
  paymentStatus: 'paid' | 'cancelled';
  paymentMethod?: 'cash' | 'upi';
  createdAt?: Date;
  paidAt?: Date;
  notes?: string;
}) {
  const subtotal = params.items.reduce((sum, i) => sum + i.total, 0);
  const billNumber = await getNextBillNumber();

  return Bill.create({
    billNumber,
    customerId: params.customer?.id,
    customerName: params.customer?.name,
    customerPhone: params.customer?.phone,
    items: params.items,
    linkedBookingIds: [],
    linkedGamingEntryIds: params.linkedGamingEntryIds ?? [],
    subtotal,
    discountAmount: 0,
    taxAmount: 0,
    total: subtotal,
    paymentMethod: params.paymentMethod ?? 'upi',
    paymentStatus: params.paymentStatus,
    paidAt: params.paymentStatus === 'paid' ? (params.paidAt ?? new Date()) : undefined,
    notes: params.notes,
    createdBy: params.adminId,
    createdAt: params.createdAt,
  });
}

async function seedTestData() {
  await connectDatabase();
  console.log('Seeding test customers, sessions, and bills...');

  await cleanupPreviousTestData();
  const admin = await requireCatalog();
  const adminId = admin._id;

  const [ps5, pc4060, ps5Resource, pcResource, coke, combo6, memberPlan] = await Promise.all([
    GamingOption.findOne({ slug: 'ps5' }),
    GamingOption.findOne({ slug: 'pc-rtx-4060' }),
    GamingResource.findOne({ code: 'TV-002' }),
    GamingResource.findOne({ code: 'PC-001' }),
    Product.findOne({ name: 'Coke' }),
    Combo.findOne({ name: 'Combo 6' }),
    MembershipPlan.findOne({ name: 'PC RTX 4060 Member', isActive: true }),
  ]);

  if (!ps5 || !pc4060 || !ps5Resource || !pcResource) {
    throw new Error('Catalog incomplete. Run `npm run seed` first.');
  }

  const priya = await Customer.create({
    name: 'Priya Sharma',
    phone: `${TEST_PHONE_PREFIX}000001`,
    notes: 'Regular weekend gamer',
    tags: [TEST_TAG],
    totalVisits: 0,
    totalSpending: 0,
  });

  const divya = await Customer.create({
    name: 'Divya Nair',
    phone: `${TEST_PHONE_PREFIX}000002`,
    notes: 'PC member · high spender',
    tags: [TEST_TAG, 'member'],
    totalVisits: 0,
    totalSpending: 0,
  });

  const arjun = await Customer.create({
    name: 'Arjun Patel',
    phone: `${TEST_PHONE_PREFIX}000003`,
    notes: 'Currently playing',
    tags: [TEST_TAG],
    totalVisits: 0,
    totalSpending: 0,
  });

  if (memberPlan) {
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + memberPlan.durationDays);
    await CustomerMembership.create({
      customerId: divya._id,
      planId: memberPlan._id,
      startDate,
      expiryDate,
      status: 'active',
    });
  }

  await Booking.create({
    referenceCode: 'TEST-BK-PRIYA01',
    customerId: priya._id,
    customerName: priya.name,
    customerPhone: priya.phone,
    gamingOptionId: ps5._id,
    resourceId: ps5Resource._id,
    playerCount: 2,
    scheduledStart: minutesFromNow(120),
    scheduledEnd: minutesFromNow(180),
    durationMinutes: 60,
    suggestedPrice: 180,
    status: 'confirmed',
    notes: TEST_TAG,
    source: 'admin',
  });

  const divyaPastEntry = await GamingEntry.create({
    customerId: divya._id,
    customerName: divya.name,
    gamingOptionId: pc4060._id,
    resourceId: pcResource._id,
    playerCount: 1,
    startedAt: daysAgo(2),
    expectedEndAt: new Date(daysAgo(2).getTime() + 60 * 60 * 1000),
    endedAt: new Date(daysAgo(2).getTime() + 60 * 60 * 1000),
    durationMinutes: 60,
    actualDurationMinutes: 60,
    calculatedPrice: 90,
    finalPrice: 90,
    status: 'completed',
    notes: TEST_TAG,
  });

  const billItems: IBillItem[] = [
    {
      type: 'gaming',
      name: 'PC RTX 4060',
      description: '1 hr',
      quantity: 1,
      unitPrice: 90,
      discount: 0,
      total: 90,
      gamingEntryId: divyaPastEntry._id,
      gamingOptionId: pc4060._id,
      durationMinutes: 60,
      calculatedPrice: 90,
      isPriceOverridden: false,
    },
  ];

  if (coke) {
    billItems.push({
      type: 'product',
      name: coke.name,
      quantity: 1,
      unitPrice: coke.price,
      discount: 0,
      total: coke.price,
      productId: coke._id,
      isPriceOverridden: false,
    });
  }

  if (combo6) {
    billItems.push({
      type: 'combo',
      name: combo6.name,
      description: combo6.description,
      quantity: 1,
      unitPrice: combo6.price,
      discount: 0,
      total: combo6.price,
      comboId: combo6._id,
      isPriceOverridden: false,
    });
  }

  const divyaBill = await createBill({
    adminId,
    customer: { id: divya._id, name: divya.name, phone: divya.phone },
    items: billItems,
    linkedGamingEntryIds: [divyaPastEntry._id],
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    createdAt: daysAgo(2),
    paidAt: daysAgo(2),
    notes: TEST_TAG,
  });
  divyaPastEntry.billId = divyaBill._id;
  await divyaPastEntry.save();

  await GamingEntry.create({
    customerId: arjun._id,
    customerName: arjun.name,
    gamingOptionId: ps5._id,
    resourceId: ps5Resource._id,
    playerCount: 1,
    startedAt: minutesAgo(30),
    expectedEndAt: minutesFromNow(30),
    durationMinutes: 60,
    calculatedPrice: 120,
    finalPrice: 120,
    status: 'active',
    notes: TEST_TAG,
  });

  for (const customer of [priya, divya]) {
    const paidBills = await Bill.find({ customerId: customer._id, paymentStatus: 'paid' });
    await Customer.findByIdAndUpdate(customer._id, {
      totalVisits: paidBills.length,
      totalSpending: paidBills.reduce((sum, b) => sum + b.total, 0),
      lastVisitAt: paidBills[0]?.paidAt,
    });
  }

  console.log('\nTest data seeded successfully!');
  console.log('  Customers: 3 (Priya, Divya [member], Arjun [active session])');
  console.log('  Phones: 9999000001, 9999000002, 9999000003');
  console.log('  Delete with: npm run seed:test-data:clean');

  await disconnectDatabase();
}

seedTestData().catch((err) => {
  console.error('Test data seed failed:', err);
  process.exit(1);
});
