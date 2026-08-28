import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Booking, Bill, CustomerHistory, GamingEntry } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { InfiniteScrollDirective } from '../../shared/directives/infinite-scroll.directive';
import { TabsSlidingDirective, LoadingStateComponent, NumberPopInComponent } from '../../shared/transitions';
import { bookingTitle, sessionRef, sessionTitle } from '../../shared/utils/session-display';

type HistoryTab = 'overview' | 'bookings' | 'gaming' | 'bills';

type PaginatedTab = 'bookings' | 'gaming' | 'bills';

interface TabState<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loaded: boolean;
}

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, InrPipe, DurationPipe, IconComponent, InfiniteScrollDirective, TabsSlidingDirective, LoadingStateComponent],
  styles: [
    `
      .profile-hero {
        @apply rounded-2xl border border-border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5;
      }
      .avatar {
        @apply w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center text-accent shrink-0 ring-1 ring-accent/20;
      }
      .avatar--member {
        @apply bg-emerald-500/15 text-emerald-400 ring-emerald-500/25;
      }
      .icon-action {
        @apply flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors;
      }
      .icon-action-danger {
        @apply hover:text-status-danger hover:bg-status-danger/10;
      }
      .stat-grid {
        @apply grid grid-cols-2 gap-2.5 pt-4 border-t border-border-subtle;
      }
      .stat-pill {
        @apply rounded-xl bg-white/[0.04] border border-border-subtle px-3.5 py-3.5;
      }
      .stat-value {
        @apply text-2xl font-bold leading-none tabular-nums text-text-primary;
      }
      .stat-value-accent {
        @apply text-accent;
      }
      .stat-label {
        @apply text-[10px] uppercase tracking-caption text-text-muted mt-2;
      }
      .activity-row {
        @apply flex items-center gap-3 py-3.5 border-b border-border-subtle last:border-b-0;
      }
      .activity-icon {
        @apply flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] text-text-secondary shrink-0;
      }
      .empty-inline {
        @apply flex items-center gap-2 py-3 text-sm text-text-muted;
      }
    `,
  ],
  template: `
    @if (loading()) {
      <app-loading-state mode="thinking" [thinkingStates]="['Loading profile', 'Fetching history', 'Almost ready']" />
    } @else if (history()) {
      <!-- Top bar -->
      <div class="flex items-center justify-between mb-4">
        <a routerLink="/admin/customers" class="icon-action">
          <app-icon name="arrow_back" size="sm" />
        </a>
        <div class="flex gap-1">
          <a [routerLink]="['/admin/customers', history()!.customer._id, 'edit']" class="icon-action" title="Edit">
            <app-icon name="edit" size="sm" />
          </a>
          <button type="button" (click)="confirmDelete()" class="icon-action icon-action-danger" title="Delete">
            <app-icon name="delete" size="sm" />
          </button>
        </div>
      </div>

      <!-- Profile hero -->
      <div class="profile-hero mb-5">
        <div class="flex items-center gap-4">
          <div class="avatar" [class.avatar--member]="!!history()!.customer.activeMembership">
            <span class="text-xl font-semibold uppercase">{{ initials() }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-xl font-semibold truncate leading-tight">{{ history()!.customer.name }}</h1>
            <a [href]="'tel:' + history()!.customer.phone" class="inline-flex items-center gap-1.5 text-text-secondary text-sm mt-1.5 hover:text-accent transition-colors">
              <app-icon name="call" size="sm" />
              <span class="font-mono">{{ history()!.customer.phone }}</span>
            </a>
            @if (history()!.customer.email) {
              <p class="text-text-muted text-sm mt-1 truncate">{{ history()!.customer.email }}</p>
            }
          </div>
        </div>

        @if (history()!.customer.tags?.length || history()!.customer.activeMembership) {
          <div class="flex flex-wrap items-center gap-1.5 mt-4">
            @if (history()!.customer.activeMembership) {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold uppercase tracking-caption border border-emerald-500/20">
                <app-icon name="card_membership" size="sm" class="!text-[11px]" />
                Member
              </span>
            }
            @for (tag of history()!.customer.tags ?? []; track tag) {
              <span class="badge-info text-[10px] py-0.5">{{ tag }}</span>
            }
          </div>
        }

        @if (history()!.customer.notes) {
          <p class="text-text-secondary text-sm mt-3 leading-relaxed">
            {{ history()!.customer.notes }}
          </p>
        }

        <!-- Stats -->
        <div class="stat-grid" [class.mt-3]="!!history()!.customer.notes" [class.mt-4]="!history()!.customer.notes">
          <div class="stat-pill">
            <p class="stat-value stat-value-accent">{{ history()!.summary.totalVisits }}</p>
            <p class="stat-label">Visits</p>
          </div>
          <div class="stat-pill">
            <p class="stat-value stat-value-accent">{{ history()!.summary.totalSpending | inr }}</p>
            <p class="stat-label">Total spent</p>
          </div>
          <div class="stat-pill">
            <p class="stat-value">{{ bookingCount() }}</p>
            <p class="stat-label">Bookings</p>
          </div>
          <div class="stat-pill">
            <p class="stat-value">{{ gamingCount() }}</p>
            <p class="stat-label">Sessions</p>
          </div>
        </div>

        @if (history()!.summary.lastVisit) {
          <p class="text-text-muted text-xs mt-3 flex items-center gap-1">
            <app-icon name="schedule" size="sm" />
            Last visit {{ history()!.summary.lastVisit | date:'mediumDate' }}
          </p>
        }
      </div>

      <!-- Tabs -->
      <div class="app-tabs mb-4 overflow-x-auto" role="tablist" [tTabsActiveIndex]="tabIndex()">
        <span class="t-tabs-pill" aria-hidden="true"></span>
        @for (tab of tabs; track tab.id) {
          <button type="button" class="t-tab text-xs" role="tab" [attr.aria-selected]="activeTab() === tab.id" (click)="setActiveTab(tab.id)">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab content -->
      <div class="card !p-0 overflow-hidden">
        @switch (activeTab()) {
          @case ('overview') {
            <div class="px-4 pt-3 pb-1">
              <p class="section-heading mb-1">Recent activity</p>
            </div>
            @if (recentBills().length || recentGaming().length) {
              @for (bill of recentBills(); track bill._id) {
                <div class="activity-row px-4">
                  <div class="activity-icon">
                    <app-icon name="receipt_long" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ bill.billNumber }}</p>
                    <p class="text-text-muted text-xs">{{ bill.createdAt | date:'mediumDate' }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="font-semibold text-sm">{{ bill.total | inr }}</p>
                    <span [class]="billStatusBadge(bill.paymentStatus)" class="text-[10px]">{{ bill.paymentStatus }}</span>
                  </div>
                </div>
              }
              @for (entry of recentGaming(); track entry._id) {
                <div class="activity-row px-4">
                  <div class="activity-icon">
                    <app-icon name="sports_esports" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ sessionTitle(entry) }}</p>
                    <p class="text-text-muted text-xs">{{ entry.startedAt | date:'mediumDate' }}</p>
                  </div>
                  <p class="font-semibold text-sm shrink-0">{{ entry.finalPrice | inr }}</p>
                </div>
              }
              <div class="px-4 py-3 border-t border-border-subtle flex gap-2">
                @if (history()!.bills.length) {
                  <button type="button" class="text-xs text-accent font-medium" (click)="setActiveTab('bills')">
                    View all bills →
                  </button>
                }
                @if (history()!.gamingEntries.length) {
                  <button type="button" class="text-xs text-accent font-medium" (click)="setActiveTab('gaming')">
                    View all sessions →
                  </button>
                }
              </div>
            } @else {
              <div class="empty-inline px-4 pb-4">
                <app-icon name="history" size="sm" class="opacity-40" />
                <span>No activity yet</span>
              </div>
            }
          }
          @case ('bookings') {
            @if (tabBookings().length) {
              @for (booking of tabBookings(); track booking._id) {
                <div class="activity-row px-4">
                  <div class="activity-icon">
                    <app-icon name="event" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ bookingTitle(booking) }}</p>
                    <p class="text-text-muted text-xs">{{ booking.scheduledStart | date:'medium' }}</p>
                    <p class="text-text-secondary text-xs mt-0.5">
                      {{ booking.referenceCode }} · {{ booking.durationMinutes | duration }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <span [class]="statusBadge(booking.status)" class="text-[10px]">{{ booking.status }}</span>
                    @if (booking.suggestedPrice) {
                      <p class="text-sm font-semibold mt-1">{{ booking.suggestedPrice | inr }}</p>
                    }
                  </div>
                </div>
              }
              @if (tabHasMore('bookings')) {
                <div
                  appInfiniteScroll
                  [disabled]="tabLoadingMore('bookings')"
                  (loadMore)="loadTabMore('bookings')"
                  class="flex justify-center py-3 text-text-muted text-xs"
                >
                  @if (tabLoadingMore('bookings')) { Loading more... }
                </div>
              }
            } @else if (!tabLoading('bookings')) {
              <div class="empty-inline px-4 py-4">
                <app-icon name="event_busy" size="sm" class="opacity-40" />
                <span>No bookings</span>
              </div>
            }
          }
          @case ('gaming') {
            @if (tabSessions().length) {
              @for (entry of tabSessions(); track entry._id) {
                <div class="activity-row px-4">
                  <div class="activity-icon">
                    <app-icon name="sports_esports" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ sessionTitle(entry) }}</p>
                    <p class="text-text-muted text-xs">{{ entry.startedAt | date:'medium' }}</p>
                    <p class="text-text-secondary text-xs mt-0.5">
                      {{ sessionRef(entry) }} · {{ entry.durationMinutes | duration }}
                      @if (entry.priceOverride != null) {
                        · price override
                      }
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <span [class]="gamingStatusBadge(entry.status)" class="text-[10px]">{{ entry.status }}</span>
                    <p class="text-sm font-semibold mt-1">{{ entry.finalPrice | inr }}</p>
                  </div>
                </div>
              }
              @if (tabHasMore('gaming')) {
                <div
                  appInfiniteScroll
                  [disabled]="tabLoadingMore('gaming')"
                  (loadMore)="loadTabMore('gaming')"
                  class="flex justify-center py-3 text-text-muted text-xs"
                >
                  @if (tabLoadingMore('gaming')) { Loading more... }
                </div>
              }
            } @else if (!tabLoading('gaming')) {
              <div class="empty-inline px-4 py-4">
                <app-icon name="sports_esports" size="sm" class="opacity-40" />
                <span>No gaming sessions</span>
              </div>
            }
          }
          @case ('bills') {
            @if (tabBills().length) {
              @for (bill of tabBills(); track bill._id) {
                <div class="activity-row px-4">
                  <div class="activity-icon">
                    <app-icon name="receipt_long" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm">{{ bill.billNumber }}</p>
                    <p class="text-text-muted text-xs">{{ bill.createdAt | date:'medium' }}</p>
                    <p class="text-text-secondary text-xs mt-0.5">
                      {{ bill.items.length }} item{{ bill.items.length === 1 ? '' : 's' }}
                      @if (bill.paymentMethod) {
                        · {{ bill.paymentMethod }}
                      }
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <span [class]="billStatusBadge(bill.paymentStatus)" class="text-[10px]">{{ bill.paymentStatus }}</span>
                    <p class="text-sm font-semibold mt-1">{{ bill.total | inr }}</p>
                  </div>
                </div>
              }
              @if (tabHasMore('bills')) {
                <div
                  appInfiniteScroll
                  [disabled]="tabLoadingMore('bills')"
                  (loadMore)="loadTabMore('bills')"
                  class="flex justify-center py-3 text-text-muted text-xs"
                >
                  @if (tabLoadingMore('bills')) { Loading more... }
                </div>
              }
            } @else if (!tabLoading('bills')) {
              <div class="empty-inline px-4 py-4">
                <app-icon name="receipt_long" size="sm" class="opacity-40" />
                <span>No bills</span>
              </div>
            }
          }
        }
      </div>
    }
  `,
})
export class CustomerDetailComponent implements OnInit {
  private customerService = inject(CustomerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  history = signal<CustomerHistory | null>(null);
  loading = signal(true);
  activeTab = signal<HistoryTab>('overview');
  customerId = signal('');

  tabBookings = signal<Booking[]>([]);
  tabSessions = signal<GamingEntry[]>([]);
  tabBills = signal<Bill[]>([]);

  private tabState = signal<Record<PaginatedTab, TabState<unknown>>>({
    bookings: { items: [], page: 0, hasMore: false, loading: false, loadingMore: false, loaded: false },
    gaming: { items: [], page: 0, hasMore: false, loading: false, loadingMore: false, loaded: false },
    bills: { items: [], page: 0, hasMore: false, loading: false, loadingMore: false, loaded: false },
  });

  tabs: { id: HistoryTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'gaming', label: 'Sessions' },
    { id: 'bills', label: 'Bills' },
  ];

  tabIndex = computed(() => this.tabs.findIndex((t) => t.id === this.activeTab()));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/customers']);
      return;
    }
    this.customerId.set(id);
    this.load(id);
  }

  setActiveTab(tab: HistoryTab) {
    this.activeTab.set(tab);
    if (tab === 'bookings' || tab === 'gaming' || tab === 'bills') {
      this.ensureTabLoaded(tab);
    }
  }

  load(id: string) {
    this.loading.set(true);
    this.customerService.getHistory(id).subscribe({
      next: (h) => {
        this.history.set(h);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.error('Customer not found');
        this.router.navigate(['/admin/customers']);
      },
    });
  }

  initials() {
    const name = this.history()?.customer.name.trim() || '?';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  recentBills = () => this.history()?.bills.slice(0, 2) ?? [];
  recentGaming = () => this.history()?.gamingEntries.slice(0, 2) ?? [];

  bookingCount = () => this.history()?.summary.bookingCount ?? 0;
  gamingCount = () => this.history()?.summary.gamingCount ?? 0;

  tabLoading(tab: PaginatedTab): boolean {
    return this.tabState()[tab].loading;
  }

  tabLoadingMore(tab: PaginatedTab): boolean {
    return this.tabState()[tab].loadingMore;
  }

  tabHasMore(tab: PaginatedTab): boolean {
    return this.tabState()[tab].hasMore;
  }

  loadTabMore(tab: PaginatedTab) {
    const state = this.tabState()[tab];
    if (state.loadingMore || !state.hasMore) return;
    this.loadTabPage(tab, state.page + 1, false);
  }

  private ensureTabLoaded(tab: PaginatedTab) {
    if (this.tabState()[tab].loaded || this.tabState()[tab].loading) return;
    this.loadTabPage(tab, 1, true);
  }

  private loadTabPage(tab: PaginatedTab, page: number, reset: boolean) {
    const id = this.customerId();
    if (!id) return;

    this.updateTabState(tab, reset ? { loading: true } : { loadingMore: true });

    if (tab === 'bookings') {
      this.customerService.getBookings(id, page).subscribe({
        next: (res) => this.applyTabPage('bookings', res.items, page, res.hasMore, reset),
        error: () => this.updateTabState('bookings', { loading: false, loadingMore: false }),
      });
      return;
    }

    if (tab === 'gaming') {
      this.customerService.getSessions(id, page).subscribe({
        next: (res) => this.applyTabPage('gaming', res.items, page, res.hasMore, reset),
        error: () => this.updateTabState('gaming', { loading: false, loadingMore: false }),
      });
      return;
    }

    this.customerService.getBills(id, page).subscribe({
      next: (res) => this.applyTabPage('bills', res.items, page, res.hasMore, reset),
      error: () => this.updateTabState('bills', { loading: false, loadingMore: false }),
    });
  }

  private applyTabPage<T>(tab: PaginatedTab, items: T[], page: number, hasMore: boolean, reset: boolean) {
    if (tab === 'bookings') {
      this.tabBookings.update((existing) => (reset ? (items as Booking[]) : [...existing, ...(items as Booking[])]));
    } else if (tab === 'gaming') {
      this.tabSessions.update((existing) => (reset ? (items as GamingEntry[]) : [...existing, ...(items as GamingEntry[])]));
    } else {
      this.tabBills.update((existing) => (reset ? (items as Bill[]) : [...existing, ...(items as Bill[])]));
    }

    this.updateTabState(tab, {
      page,
      hasMore,
      loading: false,
      loadingMore: false,
      loaded: true,
    });
  }

  private updateTabState(tab: PaginatedTab, patch: Partial<TabState<unknown>>) {
    this.tabState.update((state) => ({
      ...state,
      [tab]: { ...state[tab], ...patch },
    }));
  }

  sessionTitle = sessionTitle;
  sessionRef = sessionRef;
  bookingTitle = bookingTitle;

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'badge-active',
      scheduled: 'badge-info',
      completed: 'badge-active',
      cancelled: 'badge-danger',
      no_show: 'badge-warning',
    };
    return map[status] || 'badge-info';
  }

  gamingStatusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'badge-warning',
      completed: 'badge-active',
      cancelled: 'badge-danger',
    };
    return map[status] || 'badge-info';
  }

  billStatusBadge(status: string): string {
    const map: Record<string, string> = {
      paid: 'badge-active',
      cancelled: 'badge-danger',
    };
    return map[status] || 'badge-info';
  }

  confirmDelete() {
    const customer = this.history()?.customer;
    if (!customer) return;
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;

    this.customerService.delete(customer._id).subscribe({
      next: () => {
        this.snackbar.success('Customer deleted');
        this.router.navigate(['/admin/customers']);
      },
      error: (err) => {
        this.snackbar.error(err.error?.error || 'Failed to delete customer');
      },
    });
  }
}
