import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { CustomerService, MembershipService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Customer, MembershipPlan } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { InfiniteScrollDirective } from '../../shared/directives/infinite-scroll.directive';
import { rankCustomers } from '../../shared/utils/customer-ranking';
import { PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, TabsSlidingDirective, transitionMs } from '../../shared/transitions';

type MembershipFilter = 'all' | 'active' | 'none';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InrPipe, IconComponent, InfiniteScrollDirective, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, TabsSlidingDirective],
  styles: [],
  template: `
    <div class="t-page-enter" tPageEnter>
    <div class="flex items-center justify-between mb-4">
      <h1 class="page-heading mb-0">Customers</h1>
      <a routerLink="/admin/customers/new" class="btn-primary text-sm py-2 px-4 min-h-0">
        <app-icon name="person_add" size="sm" />
        Add
      </a>
    </div>

    <div class="relative mb-3">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <app-icon name="search" size="sm" />
      </span>
      <input
        type="text"
        class="input !pl-11"
        placeholder="Search by name or phone..."
        [(ngModel)]="query"
        (input)="search()"
      />
    </div>

    <div class="app-tabs mb-4" role="tablist" [tTabsActiveIndex]="membershipFilterIndex()">
      <span class="t-tabs-pill" aria-hidden="true"></span>
      @for (filter of membershipFilters; track filter.id) {
        <button type="button" class="t-tab text-xs" role="tab" [attr.aria-selected]="membershipFilter() === filter.id" (click)="setMembershipFilter(filter.id)">
          {{ filter.label }}
        </button>
      }
    </div>

    @if (loading()) {
      <app-inline-loader label="Loading customers…" />
    } @else {
    <div class="space-y-2.5 t-list-stagger">
      @for (c of customers(); track c._id; let i = $index) {
        <div
          class="relative flex items-stretch rounded-xl border border-border bg-gradient-to-r from-white/[0.04] to-transparent overflow-hidden transition-all duration-200 hover:border-border-medium hover:from-white/[0.07] t-list-item"
          [style.--i]="i"
          [ngClass]="c.activeMembership ? 'border-emerald-500/20 from-emerald-500/[0.05]' : ''"
        >
          <a [routerLink]="['/admin/customers', c._id]" class="flex flex-1 items-center gap-3 p-3.5 min-w-0 no-underline text-inherit">
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0"
              [ngClass]="c.activeMembership ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-accent/12 text-accent'"
            >
              {{ initials(c.name) }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <p class="font-medium truncate text-text-primary">{{ c.name }}</p>
                @if (c.activeMembership) {
                  <span class="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold uppercase tracking-caption border border-emerald-500/20">
                    <app-icon name="card_membership" size="sm" class="!text-[11px]" />
                    Mem
                  </span>
                }
              </div>
              <p class="text-text-muted text-sm font-mono truncate mt-0.5">{{ c.phone }}</p>
              @if (c.activeMembership) {
                <p class="text-emerald-400/70 text-xs mt-0.5">Member</p>
              }
            </div>

            <div class="text-right shrink-0 mr-1">
              <p class="text-sm font-semibold tabular-nums text-text-primary">{{ c.totalSpending | inr }}</p>
              <p class="text-text-muted text-xs mt-0.5">{{ c.totalVisits }} visits</p>
            </div>

            <app-icon name="chevron_right" size="sm" class="text-text-muted/50 shrink-0" />
          </a>

          @if (c.activeMembership) {
            <button
              type="button"
              class="flex items-center justify-center shrink-0 border-l border-border-subtle px-3 text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors"
              title="Remove membership"
              (click)="removeMembership(c, $event)"
            >
              <app-icon name="person_remove" size="sm" />
            </button>
          } @else if (plans().length) {
            <button
              type="button"
              class="flex items-center justify-center shrink-0 border-l border-border-subtle px-3 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Add membership"
              (click)="openAssign(c, $event)"
            >
              <app-icon name="card_membership" size="sm" />
            </button>
          }
        </div>
      } @empty {
        <div class="card text-center py-10">
          <div class="flex justify-center mb-3 text-text-muted opacity-40">
            <app-icon name="groups" size="xl" />
          </div>
          <p class="text-text-muted">
            @if (query.trim() || membershipFilter() !== 'all') {
              No customers match your filters
            } @else {
              No customers yet
            }
          </p>
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

    @if (assignTarget(); as customer) {
      <div class="fixed inset-0 z-[100]" role="presentation">
        <div
          class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-out"
          [class.opacity-100]="assignModalOpen()"
          [class.opacity-0]="!assignModalOpen()"
          [class.pointer-events-none]="!assignModalOpen()"
          (click)="closeAssign()"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div
            class="w-full max-w-sm rounded-2xl border border-border-medium bg-[#1a1a1a] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-auto"
            [class.opacity-100]="assignModalOpen()"
            [class.scale-100]="assignModalOpen()"
            [class.opacity-0]="!assignModalOpen()"
            [class.scale-95]="!assignModalOpen()"
            [class.pointer-events-none]="!assignModalOpen()"
            (click)="$event.stopPropagation()"
          >
            <h2 class="font-semibold text-lg mb-0.5">Add member</h2>
            <p class="text-text-muted text-sm mb-5">Make <span class="text-text-primary font-medium">{{ customer.name }}</span> a member?</p>
            <button type="button" class="btn-primary w-full text-sm mb-2" (click)="assignMembership()">
              <app-icon name="card_membership" size="sm" />
              Confirm
            </button>
            <button type="button" class="btn-secondary w-full text-sm" (click)="closeAssign()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CustomersListComponent implements OnInit {
  private customerService = inject(CustomerService);
  private membershipService = inject(MembershipService);
  private snackbar = inject(SnackbarService);

  customers = signal<Customer[]>([]);
  plans = signal<MembershipPlan[]>([]);
  query = '';
  membershipFilter = signal<MembershipFilter>('all');
  assignTarget = signal<Customer | null>(null);
  assignModalOpen = signal(false);
  private assignClosing = false;
  page = signal(1);
  hasMore = signal(false);
  loading = signal(true);
  loadingMore = signal(false);
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private searchRequestId = 0;

  membershipFilters: { id: MembershipFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Members' },
  ];

  membershipFilterIndex = () => this.membershipFilters.findIndex((f) => f.id === this.membershipFilter());

  ngOnInit() {
    this.membershipService.getPlans().subscribe((p) => this.plans.set(p));
    this.search();
  }

  setMembershipFilter(filter: MembershipFilter) {
    this.membershipFilter.set(filter);
    this.search();
  }

  search() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadCustomers(true), 200);
  }

  loadCustomers(reset: boolean) {
    const requestId = ++this.searchRequestId;
    const page = reset ? 1 : this.page() + 1;
    const filter = this.membershipFilter();
    const membership = filter === 'all' ? undefined : filter;

    if (reset) {
      this.page.set(1);
      this.loading.set(true);
    } else this.loadingMore.set(true);

    this.customerService
      .search(this.query, page, 50, membership)
      .pipe(finalize(() => {
        if (reset) this.loading.set(false);
        this.loadingMore.set(false);
      }))
      .subscribe({
      next: (res) => {
        if (requestId !== this.searchRequestId) return;
        const ranked = rankCustomers(res.items, this.query);
        if (reset) this.customers.set(ranked);
        else this.customers.update((c) => [...c, ...ranked]);
        this.page.set(page);
        this.hasMore.set(res.hasMore);
      },
      error: () => {
        if (requestId !== this.searchRequestId) return;
      },
    });
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadCustomers(false);
  }

  openAssign(customer: Customer, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.assignClosing = false;
    this.assignTarget.set(customer);
    this.assignModalOpen.set(false);
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.assignModalOpen.set(true), 16);
  }

  closeAssign() {
    if (!this.assignTarget() || this.assignClosing) return;
    this.assignClosing = true;
    this.assignModalOpen.set(false);
    setTimeout(() => {
      this.assignTarget.set(null);
      this.assignClosing = false;
      document.body.style.overflow = '';
    }, transitionMs('--modal-close-dur', 300));
  }

  assignMembership() {
    const customer = this.assignTarget();
    const planId = this.plans()[0]?._id;
    if (!customer || !planId) return;
    this.membershipService.assign(customer._id, planId).subscribe({
      next: () => {
        this.snackbar.success('Member added');
        this.closeAssign();
        this.search();
      },
      error: (err) => this.snackbar.error(err.error?.error || 'Could not add member'),
    });
  }

  removeMembership(customer: Customer, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.membershipService.remove(customer._id).subscribe({
      next: () => {
        this.snackbar.success('Member removed');
        this.search();
      },
      error: (err) => this.snackbar.error(err.error?.error || 'Could not remove member'),
    });
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
}
