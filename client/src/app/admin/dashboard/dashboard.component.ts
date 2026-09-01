import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { GamingService, AnalyticsService, BookingService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { GamingEntry, Booking, DashboardSummary } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { NumberPopInComponent } from '../../shared/transitions/number-pop-in.component';
import { CardTiltDirective } from '../../shared/transitions/card-tilt.directive';
import { PageEnterDirective, ListStaggerDirective, InlineLoaderComponent } from '../../shared/transitions';
import { optionLabel, resourceLabel, bookingTitle as formatBookingTitle } from '../../shared/utils/session-display';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, InrPipe, IconComponent, NumberPopInComponent, CardTiltDirective, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent],
  template: `
    <div class="t-page-enter" tPageEnter>
    <!-- Quick Actions -->
    <div class="quick-actions-bar">
      <div class="quick-actions">
        <a routerLink="/admin/bookings/new" class="quick-action t-tilt">
          <span class="quick-action-icon-wrap">
            <span class="quick-action-icon quick-action-icon-booking t-tilt-card">
              <app-icon name="event" size="md" />
              <span class="t-tilt-glare" aria-hidden="true"></span>
            </span>
            <span class="quick-action-plus" aria-hidden="true">+</span>
          </span>
          <span class="quick-action-label">New booking</span>
        </a>
        <a routerLink="/admin/gaming/new" class="quick-action quick-action-featured t-tilt">
          <span class="quick-action-icon-wrap">
            <span class="quick-action-icon quick-action-icon-gaming t-tilt-card">
              <app-icon name="sports_esports" size="md" />
              <span class="t-tilt-glare" aria-hidden="true"></span>
            </span>
            <span class="quick-action-plus quick-action-plus-featured" aria-hidden="true">+</span>
          </span>
          <span class="quick-action-label">Start gaming</span>
        </a>
        <a routerLink="/admin/bills/new" class="quick-action t-tilt">
          <span class="quick-action-icon-wrap">
            <span class="quick-action-icon quick-action-icon-bill t-tilt-card">
              <app-icon name="receipt_long" size="md" />
              <span class="t-tilt-glare" aria-hidden="true"></span>
            </span>
            <span class="quick-action-plus" aria-hidden="true">+</span>
          </span>
          <span class="quick-action-label">New bill</span>
        </a>
      </div>
    </div>

    @if (loading()) {
      <app-inline-loader label="Loading dashboard…" />
    } @else {
    @if (summary(); as s) {
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <a
          routerLink="/admin/reports"
          class="stat-card t-tilt no-underline hover:border-accent/35 transition-colors"
        >
          <div class="t-tilt-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Today revenue</p>
            <p class="text-xl font-semibold text-accent"><app-number-pop-in [value]="s.today.revenue | inr" /></p>
            <p class="text-text-muted text-[11px]">{{ s.today.sessions }} sessions</p>
            <span class="t-tilt-glare" aria-hidden="true"></span>
          </div>
        </a>
        <div class="stat-card t-tilt">
          <div class="t-tilt-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Need action</p>
            <p class="text-xl font-semibold" [class.text-status-danger]="actionCount() > 0">
              <app-number-pop-in [value]="actionCount()" />
            </p>
            <p class="text-text-muted text-[11px]">{{ actionHint() }}</p>
            <span class="t-tilt-glare" aria-hidden="true"></span>
          </div>
        </div>
        <div class="stat-card t-tilt">
          <div class="t-tilt-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Upcoming</p>
            <p class="text-xl font-semibold"><app-number-pop-in [value]="upcoming().length" /></p>
            <p class="text-text-muted text-[11px]">{{ upcomingHint() }}</p>
            <span class="t-tilt-glare" aria-hidden="true"></span>
          </div>
        </div>
        <div class="stat-card t-tilt">
          <div class="t-tilt-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Stations free</p>
            <p class="text-xl font-semibold" [class.text-status-active]="s.occupancy.free > 0" [class.text-status-warning]="s.occupancy.free === 0 && s.occupancy.total > 0">
              <app-number-pop-in [value]="s.occupancy.free" />
            </p>
            <p class="text-text-muted text-[11px]">{{ s.occupancy.occupied }}/{{ s.occupancy.total }} busy</p>
            <span class="t-tilt-glare" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    }

    <!-- Active Sessions -->
    <section class="mb-8">
      <h2 class="section-heading mb-4 flex items-center gap-2">
        <app-icon name="sports_esports" size="sm" />
        Active Sessions
        @if (sessions().length > 0) {
          <span class="badge-active">{{ sessions().length }}</span>
        }
      </h2>

      @if (sessions().length === 0) {
        <div class="card text-center py-10 text-text-muted">
          <div class="flex justify-center mb-3 text-text-muted/60">
            <app-icon name="sports_esports" size="xl" />
          </div>
          <p class="text-sm">No active sessions right now</p>
          <a routerLink="/admin/gaming/new" class="btn-primary inline-flex mt-4 text-sm py-2.5">
            <app-icon name="play_arrow" size="sm" />
            Start Gaming Entry
          </a>
        </div>
      }

      <div class="space-y-3 t-list-stagger">
        @for (session of sortedSessions(); track session._id; let i = $index) {
          <div class="session-card t-tilt t-list-item" [style.--i]="i">
            <div class="t-tilt-card">
            <div
              class="session-card-accent"
              [class.bg-status-danger]="session.urgency === 'overdue'"
              [class.bg-status-warning]="session.urgency === 'ending_soon' || session.urgency === 'almost_ended'"
              [class.bg-status-active]="session.urgency === 'normal'"
            ></div>

            <div class="p-4 pl-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-semibold text-base leading-tight">{{ getResourceName(session) }}</p>
                    @if (session.urgency === 'overdue') {
                      <span class="badge-danger text-[10px] py-0.5 px-2">Overdue</span>
                    } @else if (session.urgency === 'almost_ended') {
                      <span class="badge-warning text-[10px] py-0.5 px-2">Almost done</span>
                    } @else if (session.urgency === 'ending_soon') {
                      <span class="badge-warning text-[10px] py-0.5 px-2">Ending soon</span>
                    }
                  </div>
                  <p class="text-text-secondary text-sm mt-1">
                    {{ session.customerName || 'Walk-in' }} · {{ session.playerCount }}P
                  </p>
                  <p class="text-text-muted text-xs mt-0.5">{{ getOptionName(session) }}</p>
                </div>

                <div class="shrink-0 text-right">
                  <p
                    class="text-2xl font-bold tabular-nums leading-none"
                    [class.text-status-danger]="session.urgency === 'overdue'"
                    [class.text-status-warning]="session.urgency === 'ending_soon' || session.urgency === 'almost_ended'"
                    [class.text-status-active]="session.urgency === 'normal'"
                  >
                    {{ getTimerValue(session) }}
                  </p>
                  <p
                    class="text-[10px] uppercase tracking-caption mt-1 font-medium t-text-swap"
                    [class.text-status-danger]="session.urgency === 'overdue'"
                    [class.text-status-warning]="session.urgency === 'ending_soon' || session.urgency === 'almost_ended'"
                    [class.text-text-muted]="session.urgency === 'normal'"
                  >
                    {{ getTimerLabel(session) }}
                  </p>
                </div>
              </div>

              <div class="mt-4 pt-3 border-t border-border-subtle space-y-2">
                <div class="grid grid-cols-3 gap-2">
                  <button
                    (click)="extendSession(session._id, 30)"
                    class="btn-secondary text-xs py-2 px-2 min-h-[40px] !tracking-nav"
                  >
                    <app-icon name="schedule" size="sm" />
                    +30m
                  </button>
                  <button
                    (click)="extendSession(session._id, 60)"
                    class="btn-secondary text-xs py-2 px-2 min-h-[40px] !tracking-nav"
                  >
                    <app-icon name="schedule" size="sm" />
                    +1h
                  </button>
                  <button
                    (click)="endSession(session._id)"
                    class="btn-ghost text-xs py-2 px-2 min-h-[40px] border border-border !tracking-nav"
                  >
                    <app-icon name="stop_circle" size="sm" />
                    End
                  </button>
                </div>
                <a
                  [routerLink]="['/admin/bills/new']"
                  [queryParams]="{ gamingEntryId: session._id }"
                  class="btn-primary w-full text-sm py-2.5 min-h-[44px]"
                >
                  <app-icon name="receipt_long" size="sm" />
                  Bill
                </a>
              </div>
            </div>
            <span class="t-tilt-glare" aria-hidden="true"></span>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- Upcoming bookings -->
    @if (upcoming().length) {
      <section class="mb-8">
        <h2 class="section-heading mb-4 flex items-center gap-2">
          <app-icon name="event" size="sm" />
          Upcoming today
          <span class="badge-info">{{ upcoming().length }}</span>
        </h2>
        <div class="space-y-2 t-list-stagger">
          @for (booking of upcoming(); track booking._id; let i = $index) {
            <div class="card py-3.5 px-4 t-list-item" [style.--i]="i">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="font-medium text-sm">{{ booking.customerName }}</p>
                    @if (isDue(booking)) {
                      <span class="badge-warning text-[10px] py-0.5 px-2">Due</span>
                    }
                  </div>
                  <p class="text-text-muted text-xs mt-0.5">{{ bookingTitle(booking) }}</p>
                </div>
                <p class="text-sm font-semibold tabular-nums shrink-0">{{ booking.scheduledStart | date:'shortTime' }}</p>
              </div>
              <button (click)="startGaming(booking._id)" class="btn-primary w-full mt-3 text-sm py-2 min-h-[40px]">
                <app-icon name="play_arrow" size="sm" />
                Start Gaming
              </button>
            </div>
          }
        </div>
      </section>
    }
    }
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private gamingService = inject(GamingService);
  private analyticsService = inject(AnalyticsService);
  private bookingService = inject(BookingService);
  private snackbar = inject(SnackbarService);

  sessions = signal<GamingEntry[]>([]);
  summary = signal<DashboardSummary | null>(null);
  upcoming = signal<Booking[]>([]);
  loading = signal(true);
  private pollSub?: Subscription;

  private urgencyOrder: Record<string, number> = {
    overdue: 0,
    almost_ended: 1,
    ending_soon: 2,
    normal: 3,
  };

  sortedSessions = computed(() =>
    [...this.sessions()].sort(
      (a, b) =>
        (this.urgencyOrder[a.urgency ?? 'normal'] ?? 3) -
        (this.urgencyOrder[b.urgency ?? 'normal'] ?? 3),
    ),
  );

  actionCount = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    return s.attention.overdue + s.attention.endingSoon + s.attention.dueBookings;
  });

  actionHint = computed(() => {
    const s = this.summary();
    if (!s || this.actionCount() === 0) return 'All clear';
    const parts: string[] = [];
    if (s.attention.overdue) parts.push(`${s.attention.overdue} overdue`);
    if (s.attention.endingSoon) parts.push(`${s.attention.endingSoon} ending`);
    if (s.attention.dueBookings) parts.push(`${s.attention.dueBookings} due`);
    return parts.join(' · ');
  });

  upcomingHint = computed(() => {
    const list = this.upcoming();
    if (!list.length) return 'No more today';
    const next = list[0];
    const due = this.isDue(next);
    return due ? 'Next is due now' : `Next ${this.formatTime(next.scheduledStart)}`;
  });

  ngOnInit() {
    this.loadData(true);
    this.pollSub = interval(30000).subscribe(() => this.loadData(false));
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  loadData(showLoader = false) {
    if (showLoader) this.loading.set(true);
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0 && showLoader) this.loading.set(false);
    };
    this.loadLive(done);
    this.bookingService.getAll({ date: this.todayDate() }, 1, 100).subscribe({
      next: (res) => {
        this.upcoming.set(
          (res.items ?? []).filter((b) => b.status === 'scheduled' || b.status === 'confirmed'),
        );
      },
      error: () => {
        this.upcoming.set([]);
        done();
      },
      complete: () => done(),
    });
  }

  loadLive(onDone?: () => void) {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) onDone?.();
    };
    this.analyticsService.getDashboard().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => {
        this.summary.set(null);
        done();
      },
      complete: () => done(),
    });
    this.gamingService.getActiveSessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: () => {
        this.sessions.set([]);
        done();
      },
      complete: () => done(),
    });
  }

  extendSession(id: string, minutes: number) {
    this.gamingService.extendSession(id, minutes).subscribe({
      next: () => {
        this.loadLive();
        this.snackbar.success(`Extended by ${minutes} min`);
      },
      error: (err) => this.snackbar.error(err.error?.error || 'Failed to extend session'),
    });
  }

  endSession(id: string) {
    if (confirm('End this session?')) {
      this.gamingService.endSession(id).subscribe({
        next: () => {
          this.loadData();
          this.snackbar.success('Session ended');
        },
        error: (err) => this.snackbar.error(err.error?.error || 'Failed to end session'),
      });
    }
  }

  startGaming(id: string) {
    this.bookingService.startGaming(id).subscribe({
      next: () => {
        this.loadData();
        this.snackbar.success('Session started');
      },
      error: (err) => this.snackbar.error(err.error?.error || 'Failed to start session'),
    });
  }

  getResourceName(session: GamingEntry): string {
    return resourceLabel(session.resourceId) || 'Station';
  }

  getOptionName(session: GamingEntry): string {
    return optionLabel(session.gamingOptionId);
  }

  bookingTitle(booking: Booking): string {
    return formatBookingTitle(booking);
  }

  isDue(booking: Booking): boolean {
    return new Date(booking.scheduledStart).getTime() <= Date.now();
  }

  getTimerValue(session: GamingEntry): string {
    if (!session.expectedEndAt) return '--';
    const remaining = new Date(session.expectedEndAt).getTime() - Date.now();
    if (remaining <= 0) return '0';
    const mins = Math.ceil(remaining / 60000);
    if (mins < 60) return String(mins);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  getTimerLabel(session: GamingEntry): string {
    if (!session.expectedEndAt) return '';
    const remaining = new Date(session.expectedEndAt).getTime() - Date.now();
    if (remaining <= 0) return 'overdue';
    const mins = Math.ceil(remaining / 60000);
    return mins < 60 ? 'min left' : 'remaining';
  }

  private todayDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
}
