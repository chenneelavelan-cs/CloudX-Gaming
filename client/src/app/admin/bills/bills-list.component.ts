import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { BillService, CustomerService } from '../../core/services/domain.service';
import { PageActionsService } from '../../core/services/page-actions.service';
import { Bill, BillItem, Customer, PaginatedResponse } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { InfiniteScrollDirective } from '../../shared/directives/infinite-scroll.directive';
import { TabsSlidingDirective, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, NumberPopInComponent, transitionMs } from '../../shared/transitions';

type BillFilter = 'all' | 'paid' | 'cancelled';

@Component({
  selector: 'app-bills-list',
  standalone: true,
  imports: [CommonModule, RouterModule, InrPipe, IconComponent, InfiniteScrollDirective, TabsSlidingDirective, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, NumberPopInComponent],
  template: `
    <div class="t-page-enter" tPageEnter>
    <div class="grid grid-cols-2 gap-3 mb-5">
      <div class="stat-card border-[rgba(36,138,61,0.25)] bg-[rgba(36,138,61,0.06)]">
        <p class="text-2xl font-semibold text-status-active tabular-nums leading-none"><app-number-pop-in [value]="paidCount()" /></p>
        <p class="text-[10px] uppercase tracking-caption text-text-muted">Paid bills</p>
      </div>
      <div class="stat-card">
        <p class="text-2xl font-semibold tabular-nums leading-none text-accent"><app-number-pop-in [value]="paidTotal() | inr" /></p>
        <p class="text-[10px] uppercase tracking-caption text-text-muted">Total collected</p>
      </div>
    </div>

    <div class="app-tabs mb-4" role="tablist" [tTabsActiveIndex]="filterIndex()">
      <span class="t-tabs-pill" aria-hidden="true"></span>
      @for (f of filters; track f.key) {
        <button type="button" class="t-tab text-xs uppercase whitespace-nowrap" role="tab" [attr.aria-selected]="filter() === f.key" (click)="filter.set(f.key); onFilterChange()">
          {{ f.label }}
          @if (f.key !== 'all') {
            <span class="opacity-70"> · {{ countForFilter(f.key) }}</span>
          }
        </button>
      }
    </div>

    @if (loading()) {
      <app-inline-loader label="Loading bills…" />
    } @else {
    <div class="flex flex-col gap-2.5 t-list-stagger">
      @for (bill of filteredBills(); track bill._id; let i = $index) {
        <button
          type="button"
          class="list-row t-list-item relative w-full text-left !py-3.5 !px-4 overflow-hidden active:scale-[0.985]"
          [style.--i]="i"
          (click)="openBill(bill)"
        >
          <span
            class="session-card-accent"
            [ngClass]="isPaid(bill) ? 'bg-status-active' : 'bg-border-medium'"
          ></span>

          <div
            class="list-row-icon ml-1"
            [ngClass]="
              isPaid(bill)
                ? 'bg-[rgba(36,138,61,0.1)] text-status-active'
                : ''
            "
          >
            <app-icon name="receipt_long" size="sm" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="font-medium truncate leading-snug">{{ bill.customerName || 'Walk-in' }}</p>
              @if (bill.paymentStatus === 'cancelled') {
                <span class="badge-danger text-[9px] py-0.5 px-2 shrink-0">Cancelled</span>
              }
            </div>
            <p class="text-text-muted text-xs mt-0.5 truncate font-mono">{{ bill.billNumber }}</p>
            <p class="text-text-muted text-[11px] mt-0.5 truncate">
              {{ bill.createdAt | date:'MMM d · h:mm a' }}
              @if (isPaid(bill) && bill.paymentMethod) {
                <span> · {{ paymentLabel(bill.paymentMethod) }}</span>
              }
            </p>
          </div>

          <div class="text-right shrink-0">
            <p class="font-semibold text-lg tabular-nums leading-none text-accent"><app-number-pop-in [value]="bill.total | inr" /></p>
            @if (isPaid(bill)) {
              <span class="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold uppercase tracking-caption text-status-active">
                <app-icon name="check_circle" size="sm" class="!text-[12px]" />
                Paid
              </span>
            }
          </div>

          <app-icon name="chevron_right" size="sm" class="text-text-muted shrink-0" />
        </button>
      } @empty {
        <div class="card text-center py-12 px-4">
          <div class="flex justify-center mb-3 text-text-muted opacity-30">
            <app-icon name="receipt_long" size="xl" />
          </div>
          <p class="text-text-muted">
            @if (filter() !== 'all') {
              No {{ filter() }} bills
            } @else {
              No bills yet
            }
          </p>
          @if (filter() === 'all') {
            <a routerLink="/admin/bills/new" class="btn-primary inline-flex mt-4 text-sm py-2 px-4 min-h-0">
              <app-icon name="add" size="sm" />
              Create first bill
            </a>
          }
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

    @if (selectedBill(); as bill) {
      <div class="fixed inset-0 z-[100]" role="presentation">
        <div
          class="bottom-sheet-backdrop"
          [class.opacity-100]="sheetOpen()"
          [class.opacity-0]="!sheetOpen()"
          [class.pointer-events-none]="!sheetOpen()"
          (click)="closeBill()"
        ></div>
        <div
          class="bottom-sheet t-panel"
          [class.is-open]="sheetOpen()"
          [class.pointer-events-none]="!sheetOpen()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'bill-sheet-title'"
          (click)="$event.stopPropagation()"
        >
          <div class="bottom-sheet-grab" aria-hidden="true">
            <div class="bottom-sheet-handle"></div>
          </div>

          <div class="bottom-sheet-header">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-3xl font-bold tracking-tight leading-none tabular-nums text-accent">{{ bill.total | inr }}</p>
                <p id="bill-sheet-title" class="text-text-secondary text-sm mt-2 font-mono truncate">{{ bill.billNumber }}</p>
                <p class="text-text-muted text-xs mt-1">{{ bill.createdAt | date:'EEEE, MMM d · h:mm a' }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0 pt-1">
                @if (bill.paymentStatus === 'cancelled') {
                  <span class="badge-danger">Cancelled</span>
                } @else {
                  <span class="badge-active">Paid</span>
                }
                <button type="button" class="bottom-sheet-close" (click)="closeBill()" aria-label="Close">
                  <app-icon name="close" size="sm" />
                </button>
              </div>
            </div>
          </div>

          <section class="px-5 py-4 border-b border-border-subtle">
            <p class="section-heading mb-3">Customer</p>
            <div class="flex items-center gap-3">
              <div class="list-row-icon !w-12 !h-12 !rounded-lg text-sm font-semibold bg-accent/15 text-accent">
                {{ initials(customerName(bill)) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate text-base">{{ customerName(bill) }}</p>
                @if (customerPhone(bill)) {
                  <a
                    [href]="'tel:' + customerPhone(bill)"
                    class="inline-flex items-center gap-1.5 text-text-secondary text-sm mt-0.5 hover:text-accent transition-colors"
                    (click)="$event.stopPropagation()"
                  >
                    <app-icon name="call" size="sm" />
                    <span class="font-mono">{{ customerPhone(bill) }}</span>
                  </a>
                } @else if (!customerIdOf(bill)) {
                  <p class="text-text-muted text-sm mt-0.5">Walk-in · no customer linked</p>
                }
                @if (selectedCustomer()?.tags?.length) {
                  <div class="flex flex-wrap gap-1 mt-2">
                    @for (tag of selectedCustomer()!.tags!.slice(0, 3); track tag) {
                      <span class="badge-info text-[10px] py-0.5">{{ tag }}</span>
                    }
                  </div>
                }
              </div>
            </div>

            @if (selectedCustomer(); as customer) {
              <div class="grid grid-cols-2 gap-2 mt-4">
                <div class="store-utility-card !p-3">
                  <p class="text-sm font-semibold tabular-nums">{{ customer.totalVisits }}</p>
                  <p class="text-[10px] uppercase tracking-caption text-text-muted mt-0.5">Visits</p>
                </div>
                <div class="store-utility-card !p-3">
                  <p class="text-sm font-semibold tabular-nums text-accent">{{ customer.totalSpending | inr }}</p>
                  <p class="text-[10px] uppercase tracking-caption text-text-muted mt-0.5">Total spent</p>
                </div>
              </div>
            }

            @if (customerIdOf(bill)) {
              <button type="button" class="btn-secondary w-full mt-3 text-sm py-2.5 min-h-0" (click)="viewCustomer(bill)">
                <app-icon name="person" size="sm" />
                View customer
              </button>
            }
          </section>

          <section class="px-5 py-4 border-b border-border-subtle">
            <p class="section-heading mb-2">Items · {{ bill.items.length }}</p>
            @for (item of bill.items; track $index) {
              <div class="flex items-center gap-3 py-3.5 border-b border-border-subtle last:border-b-0">
                <div class="list-row-icon !rounded-md" [class]="lineIconClass(item)">
                  <app-icon [name]="itemIcon(item)" size="sm" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">{{ item.name }}</p>
                  @if (item.description) {
                    <p class="text-text-muted text-xs mt-0.5 truncate">{{ item.description }}</p>
                  }
                  <p class="text-text-muted text-xs mt-0.5 tabular-nums">
                    {{ item.quantity }} × {{ item.unitPrice | inr }}
                  </p>
                </div>
                <p class="font-semibold shrink-0 tabular-nums">{{ item.total | inr }}</p>
              </div>
            } @empty {
              <p class="text-text-muted text-sm py-4 text-center">No line items</p>
            }
          </section>

          <section class="px-5 py-4 border-b border-border-subtle">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span class="tabular-nums">{{ bill.subtotal | inr }}</span>
              </div>
              @if (bill.discountAmount) {
                <div class="flex justify-between text-status-active">
                  <span>Discount</span>
                  <span class="tabular-nums">−{{ bill.discountAmount | inr }}</span>
                </div>
              }
              <div class="flex items-center justify-between pt-3 mt-2 border-t border-dashed border-border-medium">
                <span class="font-medium">Total</span>
                <span class="text-xl font-semibold tabular-nums text-accent">{{ bill.total | inr }}</span>
              </div>
            </div>

            @if (isPaid(bill) && bill.paymentMethod) {
              <div class="flex items-center gap-2.5 mt-4 px-3.5 py-2.5 rounded-lg bg-[rgba(36,138,61,0.08)] border border-[rgba(36,138,61,0.25)]">
                <app-icon name="check_circle" size="sm" class="text-status-active" />
                <div class="text-xs">
                  <p class="font-medium text-status-active">Paid via {{ paymentLabel(bill.paymentMethod) }}</p>
                  @if (bill.paidAt) {
                    <p class="text-text-muted mt-0.5">{{ bill.paidAt | date:'medium' }}</p>
                  }
                </div>
              </div>
            }
          </section>

          @if (bill.notes) {
            <section class="px-5 py-4 border-b border-border-subtle">
              <p class="section-heading mb-2">Notes</p>
              <p class="text-sm text-text-secondary leading-relaxed store-utility-card !p-3.5">{{ bill.notes }}</p>
            </section>
          }

          <div class="pb-6"></div>
        </div>
      </div>
    }
  `,
})
export class BillsListComponent implements OnInit, OnDestroy {
  private billService = inject(BillService);
  private customerService = inject(CustomerService);
  private router = inject(Router);
  private pageActionsService = inject(PageActionsService);

  bills = signal<Bill[]>([]);
  selectedBill = signal<Bill | null>(null);
  sheetOpen = signal(false);
  sheetClosing = signal(false);
  selectedCustomer = signal<Customer | null>(null);
  filter = signal<BillFilter>('all');
  page = signal(1);
  hasMore = signal(false);
  loading = signal(true);
  loadingMore = signal(false);
  billSummary = signal({ paidCount: 0, paidTotal: 0, cancelledCount: 0 });

  filters: { key: BillFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  filteredBills = computed(() => this.bills());

  paidCount = computed(() => this.billSummary().paidCount);
  paidTotal = computed(() => this.billSummary().paidTotal);
  filterIndex = computed(() => this.filters.findIndex((f) => f.key === this.filter()));

  ngOnInit() {
    this.pageActionsService.set([
      { kind: 'link', label: 'New Bill', routerLink: '/admin/bills/new', icon: 'add', primary: true },
    ]);
    this.loadBills();
  }

  onFilterChange() {
    this.loadBills();
  }

  private filterParams(): Record<string, string> {
    const f = this.filter();
    if (f === 'paid') return { status: 'paid' };
    if (f === 'cancelled') return { status: 'cancelled' };
    return {};
  }

  loadBills() {
    this.page.set(1);
    this.loading.set(true);
    this.billService
      .getAll(this.filterParams(), 1)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
      next: (res) => {
        const items = res.items ?? [];
        this.bills.set(items);
        this.hasMore.set(res.hasMore ?? false);
        const summary = (res as PaginatedResponse<Bill> & { summary?: { paidCount: number; paidTotal: number; cancelledCount: number } }).summary;
        if (summary) {
          this.billSummary.set(summary);
        } else if (this.filter() === 'all') {
          this.billSummary.set({
            paidCount: items.filter((b) => b.paymentStatus !== 'cancelled').length,
            paidTotal: items.filter((b) => b.paymentStatus !== 'cancelled').reduce((sum, b) => sum + b.total, 0),
            cancelledCount: items.filter((b) => b.paymentStatus === 'cancelled').length,
          });
        }
      },
      error: () => {
        this.bills.set([]);
        this.hasMore.set(false);
      },
    });
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    const nextPage = this.page() + 1;
    this.billService.getAll(this.filterParams(), nextPage).subscribe({
      next: (res) => {
        this.bills.update((b) => [...b, ...(res.items ?? [])]);
        this.page.set(nextPage);
        this.hasMore.set(res.hasMore ?? false);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedBill()) this.closeBill();
  }

  isPaid(bill: Bill): boolean {
    return bill.paymentStatus !== 'cancelled';
  }

  countForFilter(key: BillFilter): number {
    const summary = this.billSummary();
    if (key === 'all') return summary.paidCount + summary.cancelledCount;
    if (key === 'paid') return summary.paidCount;
    return summary.cancelledCount;
  }

  openBill(bill: Bill) {
    this.selectedBill.set(bill);
    this.selectedCustomer.set(null);
    this.sheetClosing.set(false);
    this.sheetOpen.set(false);
    document.body.style.overflow = 'hidden';

    setTimeout(() => this.sheetOpen.set(true), 16);

    const customerId = this.customerIdOf(bill);
    if (!customerId) return;

    this.customerService.getById(customerId).subscribe({
      next: (customer) => {
        if (this.selectedBill()?._id === bill._id) this.selectedCustomer.set(customer);
      },
      error: () => {
        if (this.selectedBill()?._id === bill._id) this.selectedCustomer.set(null);
      },
    });
  }

  closeBill() {
    if (!this.selectedBill() || this.sheetClosing()) return;
    this.sheetClosing.set(true);
    this.sheetOpen.set(false);
    const closeMs = transitionMs('--panel-close-dur', 350);
    setTimeout(() => {
      this.selectedBill.set(null);
      this.selectedCustomer.set(null);
      this.sheetClosing.set(false);
      document.body.style.overflow = '';
    }, closeMs);
  }

  viewCustomer(bill: Bill) {
    const customerId = this.customerIdOf(bill);
    if (!customerId) return;
    this.closeBill();
    this.router.navigate(['/admin/customers', customerId]);
  }

  customerIdOf(bill: Bill): string | null {
    const id = bill.customerId as unknown;
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id && '_id' in id) return String((id as { _id: string })._id);
    return String(id);
  }

  customerName(bill: Bill): string {
    return this.selectedCustomer()?.name || bill.customerName || 'Walk-in';
  }

  customerPhone(bill: Bill): string {
    return this.selectedCustomer()?.phone || bill.customerPhone || '';
  }

  initials(name: string): string {
    const trimmed = name.trim() || '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }

  lineIconClass(item: BillItem): string {
    if (item.type === 'gaming') return 'bg-[rgba(0,102,204,0.1)] text-accent';
    if (item.type === 'product') return 'bg-[rgba(36,138,61,0.1)] text-status-active';
    if (item.type === 'combo') return 'bg-[rgba(0,102,204,0.08)] text-status-info';
    return 'bg-bg-elevated text-text-secondary';
  }

  paymentLabel(method: string): string {
    const map: Record<string, string> = { upi: 'UPI', cash: 'Cash' };
    return map[method] || method;
  }

  itemIcon(item: BillItem): string {
    if (item.type === 'gaming') {
      const n = item.name.toLowerCase();
      if (n.includes('vr')) return 'visibility';
      if (n.includes('driving') || n.includes('wheel')) return 'sports_motorsports';
      if (n.includes('pc')) return 'computer';
      return 'sports_esports';
    }
    if (item.type === 'custom') return 'edit';
    if (item.type === 'combo') return 'inventory_2';
    return 'local_cafe';
  }
}
