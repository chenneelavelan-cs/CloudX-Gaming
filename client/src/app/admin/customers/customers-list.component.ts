import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { CustomerService, MembershipService } from '../../core/services/domain.service';
import { PageActionsService } from '../../core/services/page-actions.service';
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
  template: `
    <div class="t-page-enter" tPageEnter>
      <div class="relative mb-4">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <app-icon name="search" size="sm" />
        </span>
        <input
          type="text"
          class="input !pl-11 !rounded-full !bg-white/[0.04]"
          placeholder="Search by name or phone..."
          [(ngModel)]="query"
          (input)="search()"
        />
      </div>

      <div class="app-tabs mb-5" role="tablist" [tTabsActiveIndex]="membershipFilterIndex()">
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
        <div class="space-y-3 t-list-stagger">
          @for (c of customers(); track c._id; let i = $index) {
            <div class="t-list-item" [style.--i]="i">
              <a [routerLink]="['/admin/customers', c._id]" class="customer-card">
                <div class="customer-card-main">
                  <div
                    class="customer-card-avatar"
                    [class.customer-card-avatar-member]="!!c.activeMembership"
                    [class.customer-card-avatar-default]="!c.activeMembership"
                  >
                    {{ initials(c.name) }}
                  </div>

                  <div class="customer-card-body">
                    <p class="customer-card-name">{{ c.name }}</p>
                    <p class="customer-card-meta">
                      <span class="font-mono">{{ c.phone }}</span>
                      <span class="customer-card-meta-sep">·</span>
                      <span>{{ visitLabel(c.totalVisits) }}</span>
                    </p>
                  </div>

                  <div class="customer-card-spend">
                    <p class="customer-card-amount">{{ c.totalSpending | inr }}</p>
                  </div>
                </div>

                @if (c.activeMembership || plans().length) {
                  <div class="customer-card-footer">
                    @if (c.activeMembership) {
                      <button
                        type="button"
                        class="customer-chip customer-chip-member"
                        title="Remove membership"
                        (click)="removeMembership(c, $event)"
                      >
                        <app-icon name="card_membership" size="sm" class="!text-[11px]" />
                        Member
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="customer-chip customer-chip-add"
                        title="Add membership"
                        (click)="openAssign(c, $event)"
                      >
                        <app-icon name="person_add" size="sm" class="!text-[11px]" />
                        Add member
                      </button>
                    }
                  </div>
                }
              </a>
            </div>
          } @empty {
            <div class="rounded-2xl border border-border bg-white/[0.03] text-center py-14 px-6">
              <div class="flex justify-center mb-3 text-text-muted opacity-40">
                <app-icon name="groups" size="xl" />
              </div>
              <p class="font-medium">No customers found</p>
              <p class="text-text-muted text-sm mt-1">
                @if (query.trim() || membershipFilter() !== 'all') {
                  Try a different search or filter
                } @else {
                  Add your first customer to get started
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
          class="bottom-sheet-backdrop"
          [class.opacity-100]="assignModalOpen()"
          [class.opacity-0]="!assignModalOpen()"
          [class.pointer-events-none]="!assignModalOpen()"
          (click)="closeAssign()"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div
            class="card w-full max-w-sm !p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-auto"
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
  private pageActionsService = inject(PageActionsService);

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
    this.pageActionsService.set([
      { kind: 'link', label: 'Add Customer', routerLink: '/admin/customers/new', icon: 'person_add', primary: true },
    ]);
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

  visitLabel(count: number): string {
    return count === 1 ? '1 visit' : `${count} visits`;
  }
}
