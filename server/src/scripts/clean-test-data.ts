/**
 * Removes all test customers, sessions, and bills seeded by seed-test-data.ts.
 * Run: npm run seed:test-data:clean
 */
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Customer } from '../models/Customer';
import { GamingEntry } from '../models/GamingEntry';
import { Bill } from '../models/Bill';
import { Booking } from '../models/Booking';

dotenv.config();

const TEST_TAG = 'seed-test';
const TEST_PHONE_PREFIX = '9999';

async function cleanTestData() {
  await connectDatabase();
  console.log('Removing test customers, sessions, and bills...');

  const testCustomers = await Customer.find({
    phone: { $regex: `^${TEST_PHONE_PREFIX}` },
  });
  const testCustomerIds = testCustomers.map((c) => c._id);

  const [testBills, testEntries] = await Promise.all([
    Bill.find({
      $or: [
        { customerId: { $in: testCustomerIds } },
        { customerPhone: { $regex: `^${TEST_PHONE_PREFIX}` } },
        { notes: { $regex: TEST_TAG } },
      ],
    }),
    GamingEntry.find({ notes: { $regex: TEST_TAG } }),
  ]);

  const testBillIds = testBills.map((b) => b._id);
  const testEntryIds = testEntries.map((e) => e._id);

  const { deletedCount: extraEntries } = await GamingEntry.deleteMany({
    $or: [
      { customerId: { $in: testCustomerIds } },
      { billId: { $in: testBillIds } },
      { _id: { $in: testEntryIds } },
    ],
  });

  const { deletedCount: bookings } = await Booking.deleteMany({
    $or: [
      { customerId: { $in: testCustomerIds } },
      { referenceCode: { $regex: '^TEST-BK-' } },
    ],
  });

  const { deletedCount: bills } = await Bill.deleteMany({
    $or: [{ _id: { $in: testBillIds } }, { notes: { $regex: TEST_TAG } }],
  });

  const { deletedCount: customers } = await Customer.deleteMany({
    _id: { $in: testCustomerIds },
  });

  console.log(`  Removed ${customers} customers, ${bookings} bookings, ${extraEntries} sessions, ${bills} bills`);
  await disconnectDatabase();
}

cleanTestData().catch((err) => {
  console.error('Test data cleanup failed:', err);
  process.exit(1);
});
