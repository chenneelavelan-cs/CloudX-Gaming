import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Booking } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { InfiniteScrollDirective } from '../../shared/directives/infinite-scroll.directive';
import { PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, NumberPopInComponent } from '../../shared/transitions';

@Component({
  selector: 'app-bookings-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, InrPipe, DurationPipe, IconComponent, InfiniteScrollDirective, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, NumberPopInComponent],
  styles: [
    `
      .booking-actions {
        @apply mt-4 pt-3 border-t border-border-subtle space-y-2.5;
      }
      .action-row {
        @apply flex items-stretch rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02];
      }
      .action-btn {
        @apply flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-nav transition-colors min-h-[44px];
      }
      .action-edit {
        @apply text-text-secondary hover:bg-white/[0.05] hover:text-text-primary no-underline;
      }
      .action-edit-disabled {
        @apply text-text-muted/40 cursor-not-allowed pointer-events-none;
      }
      .action-cancel {
        @apply text-status-danger/90 hover:bg-status-danger/10 hover:text-status-danger;
      }
      .action-divider {
        @apply w-px bg-white/[0.06] self-stretch;
      }
    `,
  ],
  template: `
    <div class="t-page-enter" tPageEnter>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2.5">
        <h1 class="page-heading mb-0">Bookings</h1>
        @if (bookings().length) {
          <span class="badge-info"><app-number-pop-in [value]="bookings().length" /></span>
        }
      </div>
      <a routerLink="/admin/bookings/new" class="btn-primary text-sm py-2 px-4 min-h-0">
        <app-icon name="add" size="sm" />
        Booking
      </a>
    </div>

    <div class="mb-4">
      <label class="label">Date</label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <app-icon name="calendar_today" size="sm" />
        </span>
        <input type="date" class="input !pl-11" [(ngModel)]="selectedDate" (change)="loadBookings()" />
      </div>
    </div>

    @if (bookings().length) {
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="stat-card py-3">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Total</p>
          <p class="text-lg font-semibold"><app-number-pop-in [value]="bookings().length" /></p>
        </div>
        <div class="stat-card py-3">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Ready</p>
          <p class="text-lg font-semibold text-status-info"><app-number-pop-in [value]="readyCount()" /></p>
        </div>
        <div class="stat-card py-3">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Revenue</p>
          <p class="text-lg font-semibold text-accent"><app-number-pop-in [value]="totalRevenue() | inr" /></p>
        </div>
      </div>
    }

    @if (loading()) {
      <app-inline-loader label="Loading bookings…" />
    } @else {
    <div class="space-y-3 t-list-stagger">
      @for (booking of bookings(); track booking._id; let i = $index) {
        <div class="session-card t-list-item" [style.--i]="i">
          <div class="session-card-accent" [class]="statusAccent(booking.status)"></div>
          <div class="p-4 pl-5">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                {{ initials(booking.customerName) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="font-semibold text-base leading-tight">{{ booking.customerName }}</p>
                      <span [class]="statusBadge(booking.status)">{{ booking.status }}</span>
                    </div>
                    <p class="text-text-muted text-sm font-mono mt-0.5">{{ booking.customerPhone }}</p>
                  </div>
                  @if (booking.suggestedPrice) {
                    <p class="text-lg font-semibold text-accent tabular-nums shrink-0"><app-number-pop-in [value]="booking.suggestedPrice | inr" /></p>
                  }
                </div>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-text-secondary text-sm">
                  <span class="inline-flex items-center gap-1">
                    <app-icon name="sports_esports" size="sm" class="text-text-muted" />
                    {{ getOptionName(booking) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <app-icon name="groups" size="sm" class="text-text-muted" />
                    {{ booking.playerCount }}P
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <app-icon name="schedule" size="sm" class="text-text-muted" />
                    {{ booking.durationMinutes | duration }}
                  </span>
                </div>

                <p class="text-text-muted text-xs mt-1.5 inline-flex items-center gap-1">
                  <app-icon name="event" size="sm" />
                  {{ booking.scheduledStart | date:'medium' }}
                </p>
                @if (booking.referenceCode) {
                  <p class="text-text-muted text-xs mt-0.5 font-mono">{{ booking.referenceCode }}</p>
                }
              </div>
            </div>

            @if (isActionable(booking.status)) {
              <div class="booking-actions">
                @if (booking.status === 'confirmed' || booking.status === 'scheduled') {
                  <button (click)="startGaming(booking._id)" class="btn-primary w-full text-sm py-2.5 min-h-[44px]">
                    <app-icon name="play_arrow" size="sm" />
                    Start Gaming
                  </button>
                }
                <div class="action-row">
                  @if (canEdit(booking.status)) {
                    <a [routerLink]="['/admin/bookings', booking._id, 'edit']" class="action-btn action-edit">
                      <app-icon name="edit" size="sm" />
                      Edit
                    </a>
                  } @else {
                    <span class="action-btn action-edit action-edit-disabled">
                      <app-icon name="edit" size="sm" />
                      Edit
                    </span>
                  }
                  <div class="action-divider"></div>
                  <button type="button" (click)="cancelBooking(booking._id)" class="action-btn action-cancel">
                    <app-icon name="event_busy" size="sm" />
                    Cancel
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      } @empty {
        <div class="card text-center py-10">
          <div class="flex justify-center mb-3 text-text-muted opacity-40">
            <app-icon name="event_busy" size="xl" />
          </div>
          <p class="text-text-muted text-sm">No bookings for this date</p>
          <a routerLink="/admin/bookings/new" class="btn-primary inline-flex mt-4 text-sm py-2 px-4 min-h-0">
            <app-icon name="add" size="sm" />
            Create booking
          </a>
        </div>
      }

      @if (hasMore()) {
        <div
          appInfiniteScroll
          [disabled]="loadingMore()"
          (loadMore)="loadMore()"
          class="flex justify-center py-4 text-text-muted text-sm"
        >
          @if (loadingMore()) {
            <app-inline-loader label="Loading more…" [compact]="true" />
          }
        </div>
      }
    </div>
    }
    </div>
  `,
})
export class BookingsListComponent implements OnInit {
  private bookingService = inject(BookingService);
  private snackbar = inject(SnackbarService);
  bookings = signal<Booking[]>([]);
  selectedDate = new Date().toISOString().split('T')[0];
  page = signal(1);
  hasMore = signal(false);
  loading = signal(true);
  loadingMore = signal(false);

  readyCount = computed(() =>
    this.bookings().filter((b) => b.status === 'confirmed' || b.status === 'scheduled').length
  );

  totalRevenue = computed(() =>
    this.bookings().reduce((sum, b) => sum + (b.suggestedPrice || 0), 0)
  );

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.page.set(1);
    this.loading.set(true);
    this.bookingService
      .getAll({ date: this.selectedDate }, 1)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
      next: (res) => {
        this.bookings.set(res.items ?? []);
        this.hasMore.set(res.hasMore ?? false);
      },
      error: () => {
        this.bookings.set([]);
        this.hasMore.set(false);
      },
    });
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    const nextPage = this.page() + 1;
    this.bookingService.getAll({ date: this.selectedDate }, nextPage).subscribe({
      next: (res) => {
        this.bookings.update((b) => [...b, ...(res.items ?? [])]);
        this.page.set(nextPage);
        this.hasMore.set(res.hasMore ?? false);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  startGaming(id: string) {
    this.bookingService.startGaming(id).subscribe({
      next: () => {
        this.snackbar.success('Gaming session started');
        this.loadBookings();
      },
      error: (err) => this.snackbar.error(err.error?.error || 'Could not start gaming'),
    });
  }

  cancelBooking(id: string) {
    this.bookingService.cancel(id).subscribe({
      next: () => {
        this.snackbar.success('Booking cancelled');
        this.loadBookings();
      },
      error: (err) => this.snackbar.error(err.error?.error || 'Could not cancel booking'),
    });
  }

  isActionable(status: string): boolean {
    return ['scheduled', 'confirmed', 'started'].includes(status);
  }

  canEdit(status: string): boolean {
    return status === 'scheduled' || status === 'confirmed';
  }

  getOptionName(booking: Booking): string {
    const o = booking.gamingOptionId;
    return typeof o === 'object' ? o.name : o;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'badge-info',
      scheduled: 'badge-info',
      started: 'badge-active',
      completed: 'badge-active',
      cancelled: 'badge-danger',
      no_show: 'badge-danger',
    };
    return map[status] || 'badge';
  }

  statusAccent(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'bg-status-info',
      scheduled: 'bg-status-info',
      started: 'bg-status-active',
      completed: 'bg-status-active/50',
      cancelled: 'bg-status-danger',
      no_show: 'bg-status-danger',
    };
    return map[status] || 'bg-border-medium';
  }
}
