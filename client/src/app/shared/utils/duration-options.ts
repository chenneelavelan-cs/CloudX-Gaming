import { GamingOption } from '../models';

export type DurationContext = 'entry' | 'bill' | 'booking';

function isPcOption(opt: GamingOption | undefined): boolean {
  if (!opt) return false;
  const name = opt.name.toLowerCase();
  const slug = opt.slug?.toLowerCase() ?? '';
  return name.includes('pc') || slug.includes('pc') || name.includes('rtx');
}

export function getDurationOptions(opt: GamingOption | undefined, context: DurationContext): number[] {
  const entryBase = [15, 30, 60, 180, 300, 1440];
  const billBase = [30, 60, 120, 180, 300, 1440];
  const bookingBase = [60, 180, 300, 1440];

  let base = context === 'bill' ? billBase : context === 'booking' ? bookingBase : entryBase;

  if (!isPcOption(opt)) {
    base = base.filter((d) => d !== 1440);
  }

  if (!opt) return base;

  if (context === 'bill') {
    return base;
  }

  return base.filter((d) => d >= opt.minDurationMinutes);
}
