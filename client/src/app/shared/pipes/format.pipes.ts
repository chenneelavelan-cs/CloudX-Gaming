import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'inr', standalone: true })
export class InrPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null) return '₹0';
    return `₹${value.toLocaleString('en-IN')}`;
  }
}

@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | undefined | null): string {
    if (minutes == null || minutes <= 0) return '0m';
    if (minutes >= 1440) return '1 day';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}

@Pipe({ name: 'remaining', standalone: true })
export class RemainingPipe implements PipeTransform {
  transform(expectedEndAt: string | undefined | null): string {
    if (!expectedEndAt) return '';
    const remaining = new Date(expectedEndAt).getTime() - Date.now();
    if (remaining <= 0) return 'OVERDUE';
    const mins = Math.ceil(remaining / 60000);
    if (mins < 60) return `${mins}m remaining`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m remaining` : `${h}h remaining`;
  }
}
