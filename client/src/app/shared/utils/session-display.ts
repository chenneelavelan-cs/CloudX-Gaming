import { Booking, GamingEntry, GamingOption, GamingResource } from '../models';

function isPopulatedOption(ref: string | GamingOption | null | undefined): ref is GamingOption {
  return typeof ref === 'object' && ref !== null && 'name' in ref;
}

function isPopulatedResource(ref: string | GamingResource | null | undefined): ref is GamingResource {
  return typeof ref === 'object' && ref !== null && ('code' in ref || 'name' in ref);
}

export function optionLabel(ref: string | GamingOption | null | undefined): string {
  if (isPopulatedOption(ref)) return ref.name;
  return 'Gaming session';
}

export function resourceLabel(ref: string | GamingResource | null | undefined): string {
  if (!isPopulatedResource(ref)) return '';
  return ref.code || ref.name;
}

/** Primary line — e.g. "PS5 · PS5-003 · 4P · 2h" */
export function sessionTitle(entry: GamingEntry): string {
  const option = optionLabel(entry.gamingOptionId);
  const resource = resourceLabel(entry.resourceId);
  const parts = [option];
  if (resource) parts.push(resource);
  parts.push(`${entry.playerCount}P`);
  if (entry.durationMinutes >= 60 && entry.durationMinutes % 60 === 0) {
    parts.push(`${entry.durationMinutes / 60}h`);
  } else {
    parts.push(`${entry.durationMinutes}m`);
  }
  return parts.join(' · ');
}

/** Short reference from date + resource — e.g. "0826-VR001" */
export function sessionRef(entry: GamingEntry): string {
  const d = new Date(entry.startedAt);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const resource = resourceLabel(entry.resourceId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${mm}${dd}-${resource || 'SES'}`;
}

export function gamingOptionIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('vr')) return 'visibility';
  if (n.includes('driving') || n.includes('wheel')) return 'sports_motorsports';
  if (n.includes('pc')) return 'computer';
  return 'sports_esports';
}

export function bookingTitle(booking: Booking): string {
  const option = optionLabel(booking.gamingOptionId);
  const resource = resourceLabel(booking.resourceId);
  const parts = [option];
  if (resource) parts.push(resource);
  parts.push(`${booking.playerCount}P`);
  return parts.join(' · ');
}
