import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../core/services/domain.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { PageActionsService } from '../../core/services/page-actions.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
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
      .empty-inline {
        @apply flex items-center gap-2 py-3 text-sm text-text-muted;
      }
    `,
  ],
  template: `
    @if (loading()) {
      <app-loading-state mode="thinking" [thinkingStates]="['Loading profile', 'Fetching history', 'Almost ready']" />
    } @else if (history()) {
      <div class="customer-profile">
        <div class="customer-profile-banner">
          <div
            class="customer-profile-avatar"
            [class.customer-profile-avatar-member]="!!history()!.customer.activeMembership"
          >
            {{ initials() }}
          </div>

          @if (history()!.customer.tags?.length || history()!.customer.activeMembership) {
            <div class="customer-profile-tags">
              @if (history()!.customer.activeMembership) {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full badge-active text-[10px]">
                  <app-icon name="card_membership" size="sm" class="!text-[11px]" />
                  Member
                </span>
              }
              @for (tag of history()!.customer.tags ?? []; track tag) {
                <span class="badge-info text-[10px] py-1 px-2.5">{{ tag }}</span>
              }
            </div>
          }
        </div>

        <div class="customer-profile-contact">
          <a [href]="'tel:' + history()!.customer.phone" class="customer-profile-contact-chip">
            <app-icon name="call" size="sm" />
            <span class="font-mono">{{ history()!.customer.phone }}</span>
          </a>
          @if (history()!.customer.email) {
            <a [href]="'mailto:' + history()!.customer.email" class="customer-profile-contact-chip">
              <app-icon name="mail" size="sm" />
              <span class="truncate max-w-[12rem]">{{ history()!.customer.email }}</span>
            </a>
          }
        </div>

        @if (history()!.customer.notes) {
          <p class="customer-profile-notes">{{ history()!.customer.notes }}</p>
        }

        <div class="customer-profile-stats">
          <div class="customer-profile-stat">
            <p class="customer-profile-stat-value customer-profile-stat-value-accent">{{ history()!.summary.totalVisits }}</p>
            <p class="customer-profile-stat-label">Visits</p>
          </div>
          <div class="customer-profile-stat">
            <p class="customer-profile-stat-value customer-profile-stat-value-accent">{{ history()!.summary.totalSpending | inr }}</p>
            <p class="customer-profile-stat-label">Spent</p>
          </div>
          <div class="customer-profile-stat">
            <p class="customer-profile-stat-value">{{ bookingCount() }}</p>
            <p class="customer-profile-stat-label">Bookings</p>
          </div>
          <div class="customer-profile-stat">
            <p class="customer-profile-stat-value">{{ gamingCount() }}</p>
            <p class="customer-profile-stat-label">Sessions</p>
          </div>
        </div>

        @if (history()!.summary.lastVisit) {
          <p class="customer-profile-meta">
            <app-icon name="schedule" size="sm" />
            Last visit {{ history()!.summary.lastVisit | date:'mediumDate' }}
          </p>
        }
      </div>

      <div class="app-tabs mb-4 overflow-x-auto" role="tablist" [tTabsActiveIndex]="tabIndex()">
        <span class="t-tabs-pill" aria-hidden="true"></span>
        @for (tab of tabs; track tab.id) {
          <button type="button" class="t-tab text-xs" role="tab" [attr.aria-selected]="activeTab() === tab.id" (click)="setActiveTab(tab.id)">
            {{ tab.label }}
          </button>
        }
      </div>

      <div class="rounded-2xl border border-border bg-white/[0.03] overflow-hidden">
        @switch (activeTab()) {
          @case ('overview') {
            <div class="px-4 pt-4 pb-2">
              <p class="section-heading mb-0">Recent activity</p>
            </div>
            @if (recentBills().length || recentGaming().length) {
              @for (bill of recentBills(); track bill._id) {
                <div class="customer-activity-row">
                  <div class="customer-activity-icon customer-activity-icon-bill">
                    <app-icon name="receipt_long" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ bill.billNumber }}</p>
                    <p class="text-text-muted text-xs mt-0.5">{{ bill.createdAt | date:'mediumDate' }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="font-semibold text-sm tabular-nums text-accent">{{ bill.total | inr }}</p>
                    <span [class]="billStatusBadge(bill.paymentStatus)" class="text-[10px]">{{ bill.paymentStatus }}</span>
                  </div>
                </div>
              }
              @for (entry of recentGaming(); track entry._id) {
                <div class="customer-activity-row">
                  <div class="customer-activity-icon customer-activity-icon-session">
                    <app-icon name="sports_esports" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ sessionTitle(entry) }}</p>
                    <p class="text-text-muted text-xs mt-0.5">{{ entry.startedAt | date:'mediumDate' }}</p>
                  </div>
                  <p class="font-semibold text-sm tabular-nums shrink-0">{{ entry.finalPrice | inr }}</p>
                </div>
              }
              <div class="px-4 py-3 border-t border-border-subtle flex flex-wrap gap-3">
                @if (history()!.bills.length) {
                  <button type="button" class="text-xs text-accent font-medium" (click)="setActiveTab('bills')">
                    All bills →
                  </button>
                }
                @if (history()!.gamingEntries.length) {
                  <button type="button" class="text-xs text-accent font-medium" (click)="setActiveTab('gaming')">
                    All sessions →
                  </button>
                }
              </div>
            } @else {
              <div class="empty-inline px-4 pb-5">
                <app-icon name="history" size="sm" class="opacity-40" />
                <span>No activity yet</span>
              </div>
            }
          }
          @case ('bookings') {
            @if (tabBookings().length) {
              @for (booking of tabBookings(); track booking._id) {
                <div class="customer-activity-row">
                  <div class="customer-activity-icon customer-activity-icon-booking">
                    <app-icon name="event" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ bookingTitle(booking) }}</p>
                    <p class="text-text-muted text-xs mt-0.5">{{ booking.scheduledStart | date:'medium' }}</p>
                    <p class="text-text-secondary text-xs mt-0.5">
                      {{ booking.referenceCode }} · {{ booking.durationMinutes | duration }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <span [class]="statusBadge(booking.status)" class="text-[10px]">{{ booking.status }}</span>
                    @if (booking.suggestedPrice) {
                      <p class="text-sm font-semibold mt-1 tabular-nums">{{ booking.suggestedPrice | inr }}</p>
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
                <div class="customer-activity-row">
                  <div class="customer-activity-icon customer-activity-icon-session">
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
                <div class="customer-activity-row">
                  <div class="customer-activity-icon customer-activity-icon-bill">
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
  private confirmDialog = inject(ConfirmDialogService);
  private pageTitleService = inject(PageTitleService);
  private pageActionsService = inject(PageActionsService);

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
        this.pageTitleService.set({
          title: h.customer.name,
          subtitle: h.customer.phone,
          backLink: '/admin/customers',
        });
        this.pageActionsService.set(
          [
            {
              kind: 'link',
              label: 'Edit',
              routerLink: ['/admin/customers', h.customer._id, 'edit'],
              icon: 'edit',
              compact: true,
            },
            {
              kind: 'button',
              label: 'Delete',
              icon: 'delete',
              id: 'delete',
              danger: true,
              compact: true,
            },
          ],
          { delete: () => this.confirmDelete() },
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.pageTitleService.clear();
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

    this.confirmDialog
      .confirm({
        title: `Delete ${customer.name}?`,
        message: 'This removes the customer and cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.customerService.delete(customer._id).subscribe({
          next: () => {
            this.snackbar.success('Customer deleted');
            this.router.navigate(['/admin/customers']);
          },
          error: (err) => {
            this.snackbar.error(err.error?.error || 'Failed to delete customer');
          },
        });
      });
  }
}
