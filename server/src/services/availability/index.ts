import { Types } from 'mongoose';
import { Booking } from '../../models/Booking';
import { GamingEntry } from '../../models/GamingEntry';
import { GamingResource } from '../../models/GamingOption';

export interface AvailabilityQuery {
  resourceId: string;
  start: Date;
  end: Date;
  excludeEntryId?: string;
  excludeBookingId?: string;
}

export interface ConflictInfo {
  type: 'booking' | 'gaming_entry';
  id: string;
  start: Date;
  end: Date;
  label: string;
}

export async function checkResourceAvailability(
  query: AvailabilityQuery
): Promise<{ available: boolean; conflicts: ConflictInfo[] }> {
  const { resourceId, start, end, excludeEntryId, excludeBookingId } = query;
  const conflicts: ConflictInfo[] = [];

  const resource = await GamingResource.findById(resourceId);
  const bufferMs = (resource?.bufferMinutes || 0) * 60 * 1000;
  const bufferedStart = new Date(start.getTime() - bufferMs);
  const bufferedEnd = new Date(end.getTime() + bufferMs);

  const bookingFilter: Record<string, unknown> = {
    resourceId: new Types.ObjectId(resourceId),
    status: { $in: ['scheduled', 'confirmed', 'started'] },
    scheduledStart: { $lt: bufferedEnd },
    scheduledEnd: { $gt: bufferedStart },
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: new Types.ObjectId(excludeBookingId) };
  }

  const bookings = await Booking.find(bookingFilter);
  for (const b of bookings) {
    conflicts.push({
      type: 'booking',
      id: b._id.toString(),
      start: b.scheduledStart,
      end: b.scheduledEnd,
      label: `${b.customerName} (booking)`,
    });
  }

  const entryFilter: Record<string, unknown> = {
    resourceId: new Types.ObjectId(resourceId),
    status: 'active',
    startedAt: { $lt: bufferedEnd },
    expectedEndAt: { $gt: bufferedStart },
  };
  if (excludeEntryId) {
    entryFilter._id = { $ne: new Types.ObjectId(excludeEntryId) };
  }

  const entries = await GamingEntry.find(entryFilter);
  for (const e of entries) {
    conflicts.push({
      type: 'gaming_entry',
      id: e._id.toString(),
      start: e.startedAt,
      end: e.expectedEndAt,
      label: `${e.customerName || 'Walk-in'} (active session)`,
    });
  }

  return { available: conflicts.length === 0, conflicts };
}

export async function getAvailableResources(
  optionId: string,
  start: Date,
  end: Date
): Promise<{ resource: typeof GamingResource.prototype; available: boolean }[]> {
  const resources = await GamingResource.find({
    isActive: true,
    supportedOptionIds: new Types.ObjectId(optionId),
  }).sort({ sortOrder: 1 });

  const results = await Promise.all(
    resources.map(async (resource) => {
      const { available } = await checkResourceAvailability({
        resourceId: resource._id.toString(),
        start,
        end,
      });
      return { resource, available };
    })
  );

  return results;
}
