import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { BillService, GamingService, ProductService, ComboService } from '../../core/services/domain.service';
import { BillItem, Product, CustomerFormValue, GamingOption, PricingResult, Combo } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { CustomerSearchComponent } from '../../shared/components/customer-search.component';
import { applyDefaultGamingOption } from '../../shared/utils/gaming-defaults';
import { getDurationOptions } from '../../shared/utils/duration-options';
import { SnackbarService } from '../../core/services/snackbar.service';
import { validateRequiredFields } from '../../shared/utils/form-validation';
import { collectGroups, groupIcon, groupLabel } from '../../shared/utils/product-groups';
import { isComboMustTry } from '../../shared/utils/combo-display';
import { gamingOptionIcon } from '../../shared/utils/session-display';
import { TabsSlidingDirective, NumberPopInComponent, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, LoadingStateComponent } from '../../shared/transitions';

type AddPanel = 'gaming' | 'menu' | 'custom';

@Component({
  selector: 'app-bill-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InrPipe, DurationPipe, IconComponent, CustomerSearchComponent, TabsSlidingDirective, NumberPopInComponent, PageEnterDirective, ListStaggerDirective, InlineLoaderComponent, LoadingStateComponent],
  styles: [
    `
      .add-tab {
        @apply relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-nav transition-colors text-text-muted;
      }
      .add-tab-active {
        @apply text-text-primary;
      }
      .tab-indicator {
        @apply absolute bottom-0 h-0.5 bg-accent transition-transform duration-300 ease-out;
        width: 33.333%;
      }
      .menu-tile {
        @apply flex flex-col items-start gap-1 p-3 rounded-xl border border-border bg-white/[0.03] hover:bg-white/[0.06] hover:border-border-medium transition-colors text-left w-full min-h-[72px];
      }
      .price-input {
        @apply w-[5.25rem] text-right font-medium text-accent bg-white/[0.04] border border-accent/50 rounded-lg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none;
      }
      .bill-item {
        @apply relative flex gap-3 p-3.5 rounded-xl border border-border bg-white/[0.03];
      }
      .bill-item-icon {
        @apply flex items-center justify-center w-10 h-10 rounded-lg shrink-0;
      }
      .bill-item-icon-gaming {
        @apply bg-accent/15 text-accent;
      }
      .bill-item-icon-menu {
        @apply bg-white/[0.06] text-text-secondary;
      }
      .bill-item-icon-combo {
        @apply bg-status-info/15 text-status-info;
      }
      .bill-item-icon-custom {
        @apply bg-white/[0.06] text-text-muted;
      }
      .bill-item-body {
        @apply flex-1 min-w-0 pr-7;
      }
      .bill-item-header {
        @apply flex items-start justify-between gap-3;
      }
      .bill-item-name {
        @apply font-semibold text-sm leading-snug;
      }
      .bill-item-amount {
        @apply text-base font-bold tabular-nums text-accent shrink-0 leading-none pt-0.5 hover:opacity-80 transition-opacity;
      }
      .bill-item-price-input {
        @apply w-[4.5rem] text-right text-sm font-bold tabular-nums text-accent bg-white/[0.04] border border-accent/40 rounded-lg px-2 py-1 focus:outline-none focus:border-accent shrink-0;
      }
      .bill-item-footer {
        @apply flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1.5 text-xs text-text-muted leading-relaxed;
      }
      .bill-item-kind {
        @apply text-[10px] font-semibold uppercase tracking-caption text-text-secondary;
      }
      .bill-item-detail {
        @apply text-text-muted;
      }
      .bill-item-sep {
        @apply select-none opacity-40 text-text-muted;
      }
      .bill-item-adjusted {
        @apply text-[10px] font-medium text-amber-400/90;
      }
      .bill-item-remove {
        @apply absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors;
      }
    `,
  ],
  template: `
    <div class="form-page t-page-enter" tPageEnter>
      <!-- Customer -->
      <section class="form-card mb-4">
        <app-customer-search [initialCustomer]="draftCustomer()" (customerChange)="onCustomerChange($event)" />
      </section>

      <!-- Line items -->
      @if (items().length === 0) {
        <div id="bill-items-section" class="form-card text-center py-10 mb-4">
          <div class="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] text-text-muted">
            <app-icon name="receipt_long" size="lg" />
          </div>
          <p class="font-medium">No items yet</p>
          <p class="text-sm text-text-muted mt-1">Add a gaming session or menu item below</p>
        </div>
      } @else {
        <div id="bill-items-section" class="space-y-2 mb-4 t-list-stagger is-shown">
        @for (item of items(); track $index) {
          <div class="bill-item t-list-item" [style.--i]="$index">
            <div class="bill-item-icon" [ngClass]="itemIconClass(item)">
              <app-icon [name]="itemIcon(item)" size="sm" />
            </div>

            <div class="bill-item-body">
              <div class="bill-item-header">
                <p class="bill-item-name">{{ item.name }}</p>
                @if (editingPriceIndex() === $index) {
                  <input
                    type="number"
                    class="bill-item-price-input"
                    [ngModel]="item.total"
                    (ngModelChange)="updateItemPrice($index, $event)"
                    (blur)="stopPriceEdit()"
                    (keydown.enter)="stopPriceEdit()"
                    autofocus
                    min="0"
                    step="1"
                    aria-label="Item price"
                  />
                } @else {
                  <button type="button" class="bill-item-amount" (click)="startPriceEdit($index)" aria-label="Edit price">
                    {{ item.total | inr }}
                  </button>
                }
              </div>

              <div class="bill-item-footer">
                <span class="bill-item-kind">{{ itemTypeLabel(item.type) }}</span>
                @if (item.description) {
                  <span class="bill-item-sep">·</span>
                  <span class="bill-item-detail">{{ item.description }}</span>
                }
                @if (item.quantity > 1) {
                  <span class="bill-item-sep">·</span>
                  <span class="bill-item-detail">{{ item.quantity }} × {{ item.unitPrice | inr }}</span>
                }
                @if (item.isPriceOverridden) {
                  <span class="bill-item-sep">·</span>
                  <span class="bill-item-adjusted">Adjusted</span>
                }
              </div>
            </div>

            <button type="button" (click)="removeItem($index)" class="bill-item-remove" aria-label="Remove">
              <app-icon name="close" size="sm" />
            </button>
          </div>
        }
      </div>
    }

    <!-- Add panel tabs -->
    <div class="rounded-xl border border-border bg-white/[0.03] overflow-hidden mb-4">
      <div class="app-tabs app-tabs--bar" role="tablist" [tTabsActiveIndex]="activeTabIndex()">
        <span class="t-tabs-pill" aria-hidden="true"></span>
        <button type="button" class="t-tab" role="tab" [attr.aria-selected]="addPanel() === 'gaming'" (click)="setPanel('gaming')">
          <app-icon name="sports_esports" size="sm" />
          Gaming
        </button>
        <button type="button" class="t-tab" role="tab" [attr.aria-selected]="addPanel() === 'menu'" (click)="setPanel('menu')">
          <app-icon name="restaurant" size="sm" />
          Menu
        </button>
        <button type="button" class="t-tab" role="tab" [attr.aria-selected]="addPanel() === 'custom'" (click)="setPanel('custom')">
          <app-icon name="add_circle" size="sm" />
          Extra
        </button>
      </div>

      @if (catalogLoading()) {
        <app-inline-loader label="Loading menu & gaming options…" />
      } @else if (addPanel() === 'gaming') {
        <div class="p-4 space-y-4">
          <p class="section-heading">Select gaming option</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            @for (opt of gamingOptions(); track opt._id) {
              <button
                type="button"
                (click)="selectGamingOption(opt._id)"
                [class]="gamingOptionTileClass(opt._id)"
              >
                <span class="option-tile-icon">
                  <app-icon [name]="gamingIcon(opt.name)" size="sm" />
                </span>
                <span class="min-w-0">
                  <span class="block font-medium truncate">{{ opt.name }}</span>
                  @if (opt.description) {
                    <span class="block text-text-muted text-xs mt-0.5 line-clamp-2">{{ opt.description }}</span>
                  }
                </span>
              </button>
            }
          </div>

          @if (gamingForm.gamingOptionId) {
            @if (selectedGamingOption()?.supportsPlayerPricing) {
              <div>
                <p class="label">Players</p>
                <div class="choice-row">
                  @for (p of playerOptions(); track p) {
                    <button
                      type="button"
                      (click)="gamingForm.playerCount = p; recalculateGamingPrice()"
                      [class]="chipClass(gamingForm.playerCount === p)"
                    >
                      {{ p }}
                    </button>
                  }
                </div>
              </div>
            }

            <div>
              <p class="label">Duration</p>
              <div class="choice-row">
                @for (d of durationOptions(); track d) {
                  <button
                    type="button"
                    (click)="gamingForm.durationMinutes = d; recalculateGamingPrice()"
                    [class]="chipClass(gamingForm.durationMinutes === d)"
                  >
                    {{ d | duration }}
                  </button>
                }
              </div>
            </div>

            @if (gamingPricing()) {
              <div class="price-card">
                <div class="price-card-main flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="price-card-header">
                      <app-icon name="payments" size="sm" class="text-accent/70" />
                      <span class="price-card-label">Session price</span>
                    </div>
                    <p class="price-card-amount">{{ gamingPricing()!.price | inr }}</p>
                    <p class="price-card-breakdown">{{ gamingPricing()!.breakdown }}</p>
                  </div>
                  <button type="button" (click)="addGamingSession()" class="btn-primary text-sm py-2 px-4 min-h-[44px] shrink-0">
                    <app-icon name="add" size="sm" />
                    Add
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }

      @if (addPanel() === 'menu') {
        <div class="p-4 max-h-[420px] overflow-y-auto space-y-5">
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <app-icon name="search" size="sm" />
            </span>
            <input
              type="text"
              class="input py-2 text-sm !pl-11"
              placeholder="Search menu..."
              [(ngModel)]="menuSearch"
            />
          </div>
          @if (filteredCombos().length) {
            <div>
              <p class="section-heading mb-2 flex items-center gap-2">
                <app-icon name="inventory_2" size="sm" />
                Combos
              </p>
              <div class="grid grid-cols-2 gap-2">
                @for (c of filteredCombos(); track c._id) {
                  <button type="button" (click)="addCombo(c)" class="menu-tile">
                    <span class="font-medium text-sm leading-tight flex items-center gap-1">
                      @if (isMustTryCombo(c)) {
                        <app-icon name="star" size="sm" class="text-amber-400 shrink-0" />
                      }
                      {{ c.name }}
                    </span>
                    @if (c.description) {
                      <span class="text-text-muted text-xs line-clamp-2">{{ c.description }}</span>
                    }
                    <span class="text-accent text-sm font-medium mt-auto">{{ c.price | inr }}</span>
                  </button>
                }
              </div>
            </div>
          }
          @for (group of filteredProductGroups(); track group.category) {
            <div>
              <p class="section-heading mb-2 flex items-center gap-2">
                <app-icon [name]="categoryIcon(group.category)" size="sm" />
                {{ categoryLabel(group.category) }}
              </p>
              <div class="grid grid-cols-2 gap-2">
                @for (p of group.products; track p._id) {
                  <button type="button" (click)="addProduct(p)" class="menu-tile">
                    <span class="font-medium text-sm leading-tight flex items-center gap-1">
                      @if (p.mustTry) {
                        <app-icon name="star" size="sm" class="text-amber-400" />
                      }
                      {{ p.name }}
                    </span>
                    <span class="text-accent text-sm font-medium mt-auto">{{ p.price | inr }}</span>
                  </button>
                }
              </div>
            </div>
          }
          @if (filteredCombos().length === 0 && filteredProductGroups().length === 0) {
            <p class="text-center text-text-muted py-6 text-sm">No items match your search</p>
          }
        </div>
      }

      @if (addPanel() === 'custom') {
        <div class="p-4">
          <div class="flex items-center gap-2.5 mb-5 pb-4 border-b border-border-subtle">
            <div class="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-text-secondary shrink-0">
              <app-icon name="add_circle" size="sm" />
            </div>
            <div>
              <p class="font-medium text-sm text-text-primary">Extra charge</p>
              <p class="text-text-muted text-xs mt-0.5">Add a one-off fee not on the menu</p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="label" for="custom-name">Name</label>
              <input id="custom-name" class="input" [(ngModel)]="customName" placeholder="e.g. Extra controller" />
            </div>
            <div>
              <label class="label" for="custom-amount">Amount</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">₹</span>
                <input id="custom-amount" type="number" class="input !pl-9" [(ngModel)]="customAmount" min="1" placeholder="0" />
              </div>
            </div>
            <button type="button" (click)="addCustomItem()" class="btn-secondary w-full text-sm mt-1" [disabled]="!customName.trim() || customAmount <= 0">
              <app-icon name="add" size="sm" />
              Add to bill
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Bill discount -->
    <div class="rounded-xl border border-status-active/20 bg-gradient-to-br from-status-active/[0.07] via-status-active/[0.02] to-transparent p-4 space-y-4 mb-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-status-active/10 text-status-active shrink-0">
          <app-icon name="sell" size="md" />
        </div>
        <div class="min-w-0">
          <p class="font-medium text-sm">Bill discount</p>
          <p class="text-text-muted text-xs mt-0.5">Flat amount off the total · usually ₹0</p>
        </div>
        @if (effectiveDiscount() > 0) {
          <span class="ml-auto text-sm font-semibold tabular-nums text-status-active bg-status-active/10 border border-status-active/20 px-2.5 py-1 rounded-lg">
            −{{ effectiveDiscount() | inr }}
          </span>
        }
      </div>

      <div class="relative flex items-center rounded-xl border border-status-active/25 bg-black/20 overflow-hidden focus-within:border-status-active/50 focus-within:ring-2 focus-within:ring-status-active/15 transition-all">
        <span class="pl-4 pr-1 text-lg font-medium text-status-active/80 select-none">₹</span>
        <input
          id="bill-discount"
          type="number"
          class="flex-1 bg-transparent border-0 py-3 pr-4 text-2xl font-semibold text-text-primary tabular-nums placeholder:text-text-muted/40 focus:outline-none focus:ring-0"
          [(ngModel)]="manualDiscount"
          min="0"
          [max]="subtotal()"
          placeholder="0"
          aria-label="Discount amount"
        />
      </div>

      <div class="flex gap-2">
        @for (preset of discountPresets; track preset) {
          <button type="button" (click)="setDiscountPreset(preset)" [ngClass]="discountPresetClass(preset)">
            ₹{{ preset }}
          </button>
        }
        @if (manualDiscount > 0) {
          <button
            type="button"
            (click)="clearDiscount()"
            class="py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-nav text-text-muted border border-white/[0.06] hover:text-status-danger hover:border-status-danger/30 hover:bg-status-danger/5 transition-colors"
          >
            Clear
          </button>
        }
      </div>

      @if (manualDiscount > 0) {
        <div>
          <label class="label text-status-active/70" for="discount-reason">Reason</label>
          <input
            id="discount-reason"
            class="input py-2.5 text-sm bg-black/15 border-status-active/10 focus:border-status-active/30"
            [(ngModel)]="discountReason"
            placeholder="e.g. Regular customer, birthday offer"
          />
        </div>
      }
    </div>

    <!-- Totals -->
    <div class="form-card mb-4">
      <div class="flex justify-between py-1">
        <span class="text-text-secondary">Subtotal</span>
        <span>{{ subtotal() | inr }}</span>
      </div>
      @if (effectiveDiscount() > 0) {
        <div class="flex justify-between items-center py-2 px-3 -mx-1 rounded-lg bg-status-active/[0.06] border border-status-active/15">
          <span class="flex items-center gap-1.5 text-status-active text-sm">
            <app-icon name="sell" size="sm" />
            Discount
            @if (discountReason.trim()) {
              <span class="text-text-muted text-xs font-normal normal-case tracking-normal">· {{ discountReason.trim() }}</span>
            }
          </span>
          <span class="font-semibold text-status-active tabular-nums">−{{ effectiveDiscount() | inr }}</span>
        </div>
      }
      <div class="flex justify-between py-1 text-lg font-medium border-t border-border-subtle mt-2 pt-2">
        <span>Total</span>
        <span class="text-accent">{{ total() | inr }}</span>
      </div>
    </div>

    <!-- Payment & submit -->
    <section class="form-card mb-4">
      <div class="form-card-header">
        <div class="form-card-icon">
          <app-icon name="payments" size="sm" />
        </div>
        <div class="form-card-copy">
          <p class="form-card-title">Payment</p>
          <p class="form-card-hint">How the customer is paying</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        @for (method of paymentMethods; track method.id) {
          <button
            type="button"
            (click)="paymentMethod = method.id"
            [class]="paymentTileClass(method.id)"
          >
            <span class="option-tile-icon">
              <app-icon [name]="method.icon" size="sm" />
            </span>
            <span class="font-medium">{{ method.label }}</span>
          </button>
        }
      </div>
    </section>

    <div class="form-actions">
      <button type="button" (click)="createBill()" class="btn-primary w-full" [disabled]="items().length === 0 || submitting()">
        <app-icon name="receipt_long" size="sm" />
        {{ submitting() ? 'Processing...' : 'Create & Collect Payment' }}
      </button>
    </div>

    @if (error()) {
      <p class="text-status-danger text-sm mt-2">{{ error() }}</p>
    }
    </div>
  `,
})
export class BillFormComponent implements OnInit {
  private billService = inject(BillService);
  private productService = inject(ProductService);
  private comboService = inject(ComboService);
  private gamingService = inject(GamingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  linkedGamingEntryIds: string[] = [];

  items = signal<BillItem[]>([]);
  products = signal<Product[]>([]);
  combos = signal<Combo[]>([]);
  gamingOptions = signal<GamingOption[]>([]);
  selectedCustomer = signal<CustomerFormValue | null>(null);
  draftCustomer = signal<CustomerFormValue | null>(null);
  addPanel = signal<AddPanel>('gaming');
  gamingPricing = signal<PricingResult | null>(null);
  submitting = signal(false);
  catalogLoading = signal(true);
  error = signal('');
  editingPriceIndex = signal<number | null>(null);
  paymentMethod = 'upi';
  menuSearch = '';
  customName = '';
  customAmount = 0;
  manualDiscount = 0;
  discountReason = '';
  discountPresets = [10, 20, 50, 100];

  gamingForm = {
    gamingOptionId: '',
    playerCount: 1,
    durationMinutes: 60,
  };

  paymentMethods = [
    { id: 'upi', label: 'UPI', icon: 'qr_code_2' },
    { id: 'cash', label: 'Cash', icon: 'payments' },
  ];

  private readonly tabOrder: AddPanel[] = ['gaming', 'menu', 'custom'];

  productGroups = computed(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of this.products()) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }
    return collectGroups(this.products()).map((category) => ({ category, products: groups[category] }));
  });

  filteredProductGroups = computed(() => {
    const q = this.menuSearch.trim().toLowerCase();
    if (!q) return this.productGroups();
    return this.productGroups()
      .map((g) => ({
        ...g,
        products: g.products.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
      }))
      .filter((g) => g.products.length > 0);
  });

  filteredCombos = computed(() => {
    const q = this.menuSearch.trim().toLowerCase();
    const list = this.combos();
    if (!q) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  });

  selectedGamingOption = () => this.gamingOptions().find((o) => o._id === this.gamingForm.gamingOptionId);

  ngOnInit() {
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.catalogLoading.set(false);
    };

    this.productService.getAll().pipe(finalize(() => done())).subscribe((p) => this.products.set(p));
    this.comboService.getAll().pipe(finalize(() => done())).subscribe((c) => this.combos.set(c));
    this.gamingService
      .getOptions()
      .pipe(finalize(() => done()))
      .subscribe((o) => {
        this.gamingOptions.set(o);
        this.applyDefaultGamingSelection();
      });

    const gamingEntryId = this.route.snapshot.queryParamMap.get('gamingEntryId');
    if (gamingEntryId) {
      this.gamingService.getBillDraft(gamingEntryId).subscribe((draft: Record<string, unknown>) => {
        const draftItems = draft['items'] as BillItem[];
        if (draftItems) this.items.set(draftItems);
        const linked = draft['linkedGamingEntryIds'] as string[] | undefined;
        if (linked?.length) this.linkedGamingEntryIds = linked;

        const customerId = draft['customerId'] as string | { _id: string } | undefined;
        const customerName = draft['customerName'] as string | undefined;
        const customerPhone = draft['customerPhone'] as string | undefined;
        const resolvedCustomerId =
          typeof customerId === 'object' && customerId?._id ? customerId._id : customerId ? String(customerId) : undefined;

        if (resolvedCustomerId || customerName || customerPhone) {
          this.draftCustomer.set({
            linked: !!resolvedCustomerId,
            customerId: resolvedCustomerId,
            name: customerName || '',
            phone: customerPhone || '',
          });
        }
      });
    }
  }

  onCustomerChange(customer: CustomerFormValue | null) {
    this.selectedCustomer.set(customer);
  }

  applyDefaultGamingSelection() {
    const defaultId = applyDefaultGamingOption(this.gamingOptions());
    if (!defaultId) return;
    this.selectGamingOption(defaultId);
  }

  activeTabIndex = () => this.tabOrder.indexOf(this.addPanel());

  subtotal = () => this.items().reduce((sum, i) => sum + i.total, 0);

  effectiveDiscount = () => Math.min(Math.max(0, Number(this.manualDiscount) || 0), this.subtotal());

  total = () => Math.max(0, this.subtotal() - this.effectiveDiscount());

  setDiscountPreset(amount: number) {
    this.manualDiscount = amount;
  }

  clearDiscount() {
    this.manualDiscount = 0;
    this.discountReason = '';
  }

  discountPresetClass(preset: number): Record<string, boolean> {
    const active = this.manualDiscount === preset;
    return {
      'flex-1 min-w-[3.5rem] py-2 rounded-lg border text-sm font-medium transition-all': true,
      'bg-status-active/15 border-status-active/35 text-status-active': active,
      'border-white/[0.06] bg-white/[0.03] text-text-secondary hover:bg-white/[0.06] hover:border-status-active/20': !active,
    };
  }

  setPanel(panel: AddPanel) {
    this.addPanel.set(panel);
  }

  panelTabClass(panel: AddPanel): string {
    return `add-tab ${this.addPanel() === panel ? 'add-tab-active' : ''}`;
  }

  chipClass(selected: boolean): string {
    return selected ? 'choice-chip choice-chip-active' : 'choice-chip';
  }

  gamingOptionTileClass(optionId: string): string {
    return `option-tile ${this.gamingForm.gamingOptionId === optionId ? 'option-tile-selected' : ''}`;
  }

  paymentTileClass(methodId: string): string {
    return `option-tile ${this.paymentMethod === methodId ? 'option-tile-selected' : ''}`;
  }

  backLink = () => (this.route.snapshot.queryParamMap.get('gamingEntryId') ? '/admin/dashboard' : '/admin/bills');

  playerOptions = () => {
    const opt = this.selectedGamingOption();
    if (!opt) return [1];
    return Array.from({ length: opt.maxPlayers - opt.minPlayers + 1 }, (_, i) => opt.minPlayers + i);
  };

  durationOptions = () => getDurationOptions(this.selectedGamingOption(), 'bill');

  selectGamingOption(optionId: string) {
    this.gamingForm.gamingOptionId = optionId;
    const opt = this.gamingOptions().find((o) => o._id === optionId);
    this.gamingForm.playerCount = opt?.minPlayers || 1;
    this.gamingForm.durationMinutes = opt?.minDurationMinutes || 60;
    this.recalculateGamingPrice();
  }

  recalculateGamingPrice() {
    if (!this.gamingForm.gamingOptionId) return;
    this.gamingService
      .calculatePrice(this.gamingForm.gamingOptionId, this.gamingForm.playerCount, this.gamingForm.durationMinutes)
      .subscribe((p) => this.gamingPricing.set(p));
  }

  addGamingSession() {
    const opt = this.selectedGamingOption();
    const pricing = this.gamingPricing();
    if (!opt || !pricing) return;

    const durationLabel = this.formatDurationLabel(this.gamingForm.durationMinutes);
    const descParts = [durationLabel];
    if (opt.supportsPlayerPricing) descParts.push(`${this.gamingForm.playerCount} player(s)`);

    this.items.update((items) => [
      ...items,
      {
        type: 'gaming',
        name: opt.name,
        description: descParts.join(' · '),
        quantity: 1,
        unitPrice: pricing.price,
        discount: 0,
        total: pricing.price,
        gamingOptionId: opt._id,
        playerCount: this.gamingForm.playerCount,
        durationMinutes: this.gamingForm.durationMinutes,
        calculatedPrice: pricing.price,
        isPriceOverridden: false,
      },
    ]);
    this.resetGamingForm();
  }

  resetGamingForm() {
    this.applyDefaultGamingSelection();
  }

  updateItemPrice(index: number, value: number | string) {
    const newTotal = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(newTotal) || newTotal < 0) return;

    this.items.update((items) => {
      const updated = [...items];
      const item = { ...updated[index] };
      const discount = item.discount || 0;
      item.unitPrice = item.quantity > 0 ? (newTotal + discount) / item.quantity : newTotal;
      item.total = Math.max(0, item.quantity * item.unitPrice - discount);
      item.isPriceOverridden =
        item.calculatedPrice != null ? item.total !== item.calculatedPrice : true;
      updated[index] = item;
      return updated;
    });
  }

  startPriceEdit(index: number) {
    this.editingPriceIndex.set(index);
  }

  stopPriceEdit() {
    this.editingPriceIndex.set(null);
  }

  addProduct(p: Product) {
    this.items.update((items) => [
      ...items,
      {
        type: 'product',
        name: p.name,
        description: p.description,
        quantity: 1,
        unitPrice: p.price,
        discount: 0,
        total: p.price,
        productId: p._id,
        calculatedPrice: p.price,
        isPriceOverridden: false,
      },
    ]);
  }

  addCombo(c: Combo) {
    this.items.update((items) => [
      ...items,
      {
        type: 'combo',
        name: c.name,
        description: c.description || this.comboItemSummary(c),
        quantity: 1,
        unitPrice: c.price,
        discount: 0,
        total: c.price,
        comboId: c._id,
        calculatedPrice: c.price,
        isPriceOverridden: false,
      },
    ]);
  }

  comboItemSummary(c: Combo): string {
    return c.items
      .map((item) => {
        const product = typeof item.productId === 'object' ? item.productId.name : 'Item';
        return item.quantity > 1 ? `${item.quantity}× ${product}` : product;
      })
      .join(', ');
  }

  isMustTryCombo = isComboMustTry;

  addCustomItem() {
    const name = this.customName.trim();
    const price = this.customAmount;
    if (!name || price <= 0) return;
    this.items.update((items) => [
      ...items,
      { type: 'custom', name, quantity: 1, unitPrice: price, discount: 0, total: price, isPriceOverridden: false },
    ]);
    this.customName = '';
    this.customAmount = 0;
  }

  removeItem(index: number) {
    this.items.update((items) => items.filter((_, i) => i !== index));
    if (this.editingPriceIndex() === index) this.editingPriceIndex.set(null);
    else if (this.editingPriceIndex() != null && this.editingPriceIndex()! > index) {
      this.editingPriceIndex.update((i) => (i != null ? i - 1 : null));
    }
  }

  itemIcon(item: BillItem): string {
    if (item.type === 'gaming') return this.gamingIcon(item.name);
    if (item.type === 'combo') return 'inventory_2';
    if (item.type === 'custom') return 'edit';
    return 'local_cafe';
  }

  itemIconClass(item: BillItem): string {
    const map: Record<BillItem['type'], string> = {
      gaming: 'bill-item-icon-gaming',
      product: 'bill-item-icon-menu',
      combo: 'bill-item-icon-combo',
      custom: 'bill-item-icon-custom',
    };
    return map[item.type];
  }

  itemTypeLabel(type: BillItem['type']): string {
    const map: Record<BillItem['type'], string> = {
      gaming: 'Gaming',
      product: 'Menu',
      combo: 'Combo',
      custom: 'Custom',
    };
    return map[type];
  }

  gamingIcon = gamingOptionIcon;

  categoryIcon(category: string): string {
    return groupIcon(category);
  }

  categoryLabel(category: string): string {
    return groupLabel(category);
  }

  formatDurationLabel(minutes: number): string {
    if (minutes >= 1440) return '1 day';
    if (minutes < 60) return `${minutes} min`;
    const h = minutes / 60;
    return Number.isInteger(h) ? `${h} hr` : `${minutes} min`;
  }

  collectLinkedGamingEntryIds(): string[] {
    const fromQuery = this.route.snapshot.queryParamMap.get('gamingEntryId');
    const fromItems = this.items()
      .map((i) => i.gamingEntryId)
      .filter((id): id is string => !!id);
    const ids = [...this.linkedGamingEntryIds, ...(fromQuery ? [fromQuery] : []), ...fromItems];
    return [...new Set(ids)];
  }

  createBill() {
    if (
      !validateRequiredFields(
        [{ id: 'bill-items-section', label: 'at least one item', valid: () => this.items().length > 0 }],
        this.snackbar
      )
    ) {
      return;
    }

    this.submitting.set(true);
    const discount = this.effectiveDiscount();
    this.billService
      .create({
        customerId: this.selectedCustomer()?.customerId,
        customerName: this.selectedCustomer()?.name,
        customerPhone: this.selectedCustomer()?.phone,
        items: this.items().map((item) => ({
          ...item,
          gamingEntryId: item.gamingEntryId ? String(item.gamingEntryId) : undefined,
        })),
        paymentMethod: this.paymentMethod,
        linkedGamingEntryIds: this.collectLinkedGamingEntryIds(),
        ...(discount > 0
          ? {
              discountDetails: {
                manualDiscount: discount,
                manualDiscountReason: this.discountReason.trim() || undefined,
              },
            }
          : {}),
      })
      .subscribe({
        next: (bill) => {
          this.submitting.set(false);
          this.snackbar.success(`Bill ${bill.billNumber} collected via ${this.paymentMethod.toUpperCase()}`);
          this.router.navigate(['/admin/dashboard']);
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err.error?.error || 'Failed to create bill';
          this.error.set(msg);
          this.snackbar.error(msg);
        },
      });
  }
}
