import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProductService, ComboService } from '../../core/services/domain.service';
import { PageActionsService } from '../../core/services/page-actions.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Product, ProductFormValue, Combo, ComboFormValue } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { validateRequiredFields } from '../../shared/utils/form-validation';
import { collectGroups, groupLabel, normalizeGroup } from '../../shared/utils/product-groups';
import { isComboMustTry } from '../../shared/utils/combo-display';
import { TabsSlidingDirective, PageEnterDirective, InlineLoaderComponent, CardTiltDirective, transitionMs } from '../../shared/transitions';

type ModalMode = 'create' | 'edit';
type PageTab = 'products' | 'combos';
type ComboModalMode = 'create' | 'edit';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InrPipe, IconComponent, TabsSlidingDirective, PageEnterDirective, InlineLoaderComponent, CardTiltDirective],
  template: `
    <div class="t-page-enter" tPageEnter>
      <div class="app-tabs mb-5" role="tablist" [tTabsActiveIndex]="activeTab() === 'products' ? 0 : 1">
        <span class="t-tabs-pill" aria-hidden="true"></span>
        <button type="button" class="t-tab text-sm" role="tab" [attr.aria-selected]="activeTab() === 'products'" (click)="activeTab.set('products')">
          Products
        </button>
        <button type="button" class="t-tab text-sm" role="tab" [attr.aria-selected]="activeTab() === 'combos'" (click)="activeTab.set('combos')">
          Combos
        </button>
      </div>

      @if (loading()) {
        <app-inline-loader label="Loading menu…" />
      } @else {
        @if (activeTab() === 'products') {
          @if (products().length === 0) {
            <div class="card text-center py-12">
              <div class="flex justify-center mb-3 text-text-muted">
                <app-icon name="restaurant" size="xl" />
              </div>
              <p class="text-text-muted">No products yet</p>
              <button type="button" class="btn-primary inline-flex mt-4 text-sm py-2 px-4 min-h-0" (click)="openCreate()">
                <app-icon name="add" size="sm" />
                Add first product
              </button>
            </div>
          } @else {
            @for (group of productGroups(); track group) {
              <h2 class="section-heading mt-5 mb-2.5 first:mt-0">{{ groupLabel(group) }}</h2>
              <div class="space-y-2">
                @for (p of getByGroup(group); track p._id) {
                  <div class="list-row t-tilt !p-0 overflow-hidden">
                    <div class="t-tilt-card flex items-center gap-3 px-4 py-3.5 w-full">
                      <div class="flex-1 min-w-0 relative z-[1]">
                        <p class="font-medium flex items-center gap-1.5 truncate">
                          @if (p.mustTry) {
                            <app-icon name="star" size="sm" class="text-status-warning shrink-0" />
                          }
                          {{ p.name }}
                        </p>
                        @if (p.description) {
                          <p class="text-text-muted text-sm mt-0.5 truncate">{{ p.description }}</p>
                        }
                      </div>
                      <p class="font-semibold tabular-nums shrink-0 relative z-[1] text-accent">{{ p.price | inr }}</p>
                      <div class="flex items-center gap-0.5 shrink-0 relative z-[1]">
                        <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" (click)="openEdit(p); $event.stopPropagation()" [attr.aria-label]="'Edit ' + p.name">
                          <app-icon name="edit" size="sm" />
                        </button>
                        @if (confirmDeleteId() === p._id) {
                          <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-status-danger hover:bg-[rgba(215,0,21,0.08)] transition-colors" (click)="cancelDelete(); $event.stopPropagation()" aria-label="Cancel delete">
                            <app-icon name="close" size="sm" />
                          </button>
                          <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-status-danger hover:bg-[rgba(215,0,21,0.08)] transition-colors" (click)="deleteProduct(p); $event.stopPropagation()" aria-label="Confirm delete">
                            <app-icon name="check" size="sm" />
                          </button>
                        } @else {
                          <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-status-danger hover:bg-bg-elevated transition-colors" (click)="askDelete(p._id); $event.stopPropagation()" [attr.aria-label]="'Delete ' + p.name">
                            <app-icon name="delete" size="sm" />
                          </button>
                        }
                      </div>
                      <span class="t-tilt-glare" aria-hidden="true"></span>
                    </div>
                  </div>
                }
              </div>
            }
          }
        }

        @if (activeTab() === 'combos') {
          @if (combos().length === 0) {
            <div class="card text-center py-12">
              <div class="flex justify-center mb-3 text-text-muted">
                <app-icon name="inventory_2" size="xl" />
              </div>
              <p class="text-text-muted">No combos yet</p>
              <button type="button" class="btn-primary inline-flex mt-4 text-sm py-2 px-4 min-h-0" (click)="openCreateCombo()">
                <app-icon name="add" size="sm" />
                Add first combo
              </button>
            </div>
          } @else {
            <div class="space-y-2">
              @for (c of combos(); track c._id) {
                <div class="store-utility-card flex items-center gap-3 !py-3.5 !px-4">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate flex items-center gap-1.5">
                      @if (isMustTryCombo(c)) {
                        <app-icon name="star" size="sm" class="text-status-warning shrink-0" />
                      }
                      {{ c.name }}
                    </p>
                    @if (c.description) {
                      <p class="text-text-muted text-sm mt-0.5 truncate">{{ c.description }}</p>
                    }
                    <p class="text-text-muted text-xs mt-1 truncate">{{ comboItemsLabel(c) }}</p>
                  </div>
                  <p class="font-semibold tabular-nums shrink-0 text-accent">{{ c.price | inr }}</p>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" (click)="openEditCombo(c)" [attr.aria-label]="'Edit ' + c.name">
                      <app-icon name="edit" size="sm" />
                    </button>
                    @if (confirmDeleteComboId() === c._id) {
                      <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-status-danger hover:bg-[rgba(215,0,21,0.08)] transition-colors" (click)="cancelDeleteCombo()" aria-label="Cancel delete">
                        <app-icon name="close" size="sm" />
                      </button>
                      <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-status-danger hover:bg-[rgba(215,0,21,0.08)] transition-colors" (click)="deleteCombo(c)" aria-label="Confirm delete">
                        <app-icon name="check" size="sm" />
                      </button>
                    } @else {
                      <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-status-danger hover:bg-bg-elevated transition-colors" (click)="askDeleteCombo(c._id)" [attr.aria-label]="'Delete ' + c.name">
                        <app-icon name="delete" size="sm" />
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      }
    </div>

    @if (modalOpen()) {
      <div class="fixed inset-0 z-[200]" role="presentation">
        <div
          class="bottom-sheet-backdrop"
          [class.opacity-100]="modalAnimOpen()"
          [class.opacity-0]="!modalAnimOpen()"
          [class.pointer-events-none]="!modalAnimOpen()"
          (click)="closeModal()"
        ></div>
        <div
          class="bottom-sheet t-panel"
          [class.is-open]="modalAnimOpen()"
          [class.pointer-events-none]="!modalAnimOpen()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'product-sheet-title'"
          (click)="$event.stopPropagation()"
        >
          <div class="bottom-sheet-grab" aria-hidden="true">
            <div class="bottom-sheet-handle"></div>
          </div>

          <div class="bottom-sheet-header">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p id="product-sheet-title" class="text-xl font-semibold tracking-tight leading-tight">
                  {{ modalMode() === 'create' ? 'New product' : 'Edit product' }}
                </p>
                <p class="text-text-muted text-sm mt-1">
                  {{ modalMode() === 'create' ? 'Add to your menu' : editingProduct()?.name }}
                </p>
              </div>
              <button type="button" class="bottom-sheet-close" (click)="closeModal()" aria-label="Close">
                <app-icon name="close" size="sm" />
              </button>
            </div>
          </div>

          <form (ngSubmit)="saveProduct()">
            <section class="px-5 py-4 border-b border-border-subtle space-y-4">
              <p class="section-heading mb-1">Details</p>
              <div>
                <label class="label" for="product-name">Name</label>
                <input id="product-name" class="input" [(ngModel)]="form.name" name="name" placeholder="e.g. Peri Peri Fries" autocomplete="off" [class.field-error-flash]="fieldErrors().has('name')" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="product-price">Price (₹)</label>
                  <input id="product-price" type="number" class="input" [(ngModel)]="form.price" name="price" min="0" step="1" placeholder="89" [class.field-error-flash]="fieldErrors().has('price')" />
                </div>
                <div>
                  <label class="label" for="product-group">Group</label>
                  <input id="product-group" class="input" [(ngModel)]="form.category" name="category" list="product-groups" placeholder="food" autocomplete="off" />
                  <datalist id="product-groups">
                    @for (g of allGroups(); track g) {
                      <option [value]="g">{{ groupLabel(g) }}</option>
                    }
                  </datalist>
                </div>
              </div>
              <div>
                <label class="label" for="product-desc">Description</label>
                <input id="product-desc" class="input" [(ngModel)]="form.description" name="description" placeholder="Fried momo only" autocomplete="off" />
              </div>
            </section>

            <section class="px-5 py-4 border-b border-border-subtle">
              <p class="section-heading mb-3">Options</p>
              <label class="option-tile cursor-pointer" [class.option-tile-selected]="form.mustTry">
                <input type="checkbox" class="sr-only" [(ngModel)]="form.mustTry" name="mustTry" />
                <span
                  class="option-tile-icon"
                  [class.!bg-[rgba(191,72,0,0.1)]]="form.mustTry"
                  [class.!text-status-warning]="form.mustTry"
                >
                  @if (form.mustTry) { <app-icon name="star" size="sm" /> } @else { <app-icon name="star" size="sm" class="opacity-40" /> }
                </span>
                <span class="text-sm min-w-0">
                  <span class="font-medium block">Must try</span>
                  <span class="text-text-muted text-xs mt-0.5 block">Show a star on the menu</span>
                </span>
              </label>
            </section>

            <div class="sticky bottom-0 flex gap-2 p-5 bg-bg-primary border-t border-border-subtle">
              <button type="button" class="btn-secondary flex-1 min-h-0 py-3 text-xs" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary flex-1 min-h-0 py-3 text-xs" [disabled]="saving()">
                {{ saving() ? 'Saving…' : modalMode() === 'create' ? 'Add product' : 'Save changes' }}
              </button>
            </div>
          </form>
          <div class="pb-6"></div>
        </div>
      </div>
    }

    @if (comboModalOpen()) {
      <div class="fixed inset-0 z-[200]" role="presentation">
        <div
          class="bottom-sheet-backdrop"
          [class.opacity-100]="comboModalAnimOpen()"
          [class.opacity-0]="!comboModalAnimOpen()"
          [class.pointer-events-none]="!comboModalAnimOpen()"
          (click)="closeComboModal()"
        ></div>
        <div
          class="bottom-sheet t-panel"
          [class.is-open]="comboModalAnimOpen()"
          [class.pointer-events-none]="!comboModalAnimOpen()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'combo-sheet-title'"
          (click)="$event.stopPropagation()"
        >
          <form (ngSubmit)="saveCombo()">
            <div class="bottom-sheet-grab" aria-hidden="true">
              <div class="bottom-sheet-handle"></div>
            </div>

            <div class="bottom-sheet-header">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-0.5">
                    <span class="text-[2.5rem] font-semibold tracking-tight leading-none text-text-muted">₹</span>
                    <input
                      id="combo-price"
                      type="number"
                      min="0"
                      step="1"
                      class="text-[2.5rem] font-semibold tracking-tight leading-none tabular-nums text-accent bg-transparent border-0 outline-none w-full max-w-[10rem] p-0 focus:ring-0 placeholder:text-text-muted"
                      [(ngModel)]="comboForm.price"
                      name="comboPrice"
                      placeholder="0"
                      autocomplete="off"
                    />
                  </div>
                  <input
                    id="combo-name"
                    class="text-text-secondary text-sm mt-2 font-medium bg-transparent border-0 outline-none w-full p-0 placeholder:text-text-muted focus:ring-0"
                    [(ngModel)]="comboForm.name"
                    name="comboName"
                    placeholder="Combo name"
                    autocomplete="off"
                  />
                  <input
                    id="combo-desc"
                    class="text-text-muted text-xs mt-1 bg-transparent border-0 outline-none w-full p-0 placeholder:text-text-muted focus:ring-0"
                    [(ngModel)]="comboForm.description"
                    name="comboDesc"
                    placeholder="Description"
                    autocomplete="off"
                  />
                  <p id="combo-sheet-title" class="sr-only">{{ comboModalMode() === 'create' ? 'New combo' : 'Edit combo' }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0 pt-1">
                  <button
                    type="button"
                    class="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                    [ngClass]="comboForm.mustTry ? 'bg-status-warning/10 text-status-warning ring-1 ring-status-warning/25' : 'bottom-sheet-close'"
                    (click)="comboForm.mustTry = !comboForm.mustTry"
                    [attr.aria-label]="comboForm.mustTry ? 'Remove must try' : 'Mark as must try'"
                    [attr.aria-pressed]="comboForm.mustTry"
                  >
                    <app-icon name="star" size="sm" />
                  </button>
                  <button type="button" class="bottom-sheet-close" (click)="closeComboModal()" aria-label="Close">
                    <app-icon name="close" size="sm" />
                  </button>
                </div>
              </div>
              @if (comboForm.mustTry) {
                <span class="badge-warning text-[10px] mt-3">
                  <app-icon name="star" size="sm" class="!text-[11px]" />
                  Must try
                </span>
              }
            </div>

            <section class="px-5 py-4 border-b border-border-subtle">
              <div class="flex items-center justify-between mb-2">
                <p class="section-heading mb-0">Items · {{ comboForm.items.length }}</p>
                <button type="button" class="text-xs text-accent font-medium" (click)="addComboItemRow()">+ Add item</button>
              </div>
              @for (row of comboForm.items; track $index) {
                <div class="flex items-center gap-3 py-3.5 border-b border-border-subtle last:border-b-0">
                  <div class="list-row-icon !w-10 !h-10 !rounded-md">
                    <app-icon name="restaurant" size="sm" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <select
                      class="w-full bg-transparent text-sm font-medium text-text-primary border-0 outline-none p-0 pr-6 cursor-pointer truncate appearance-none"
                      [(ngModel)]="row.productId"
                      [name]="'combo-product-' + $index"
                    >
                      <option value="">Choose product…</option>
                      @for (p of products(); track p._id) {
                        <option [value]="p._id">{{ p.name }}</option>
                      }
                    </select>
                    @if (productById(row.productId); as product) {
                      <p class="text-text-muted text-xs mt-0.5 tabular-nums">{{ row.quantity }} × {{ product.price | inr }}</p>
                    } @else {
                      <p class="text-text-muted text-xs mt-0.5">Pick a product</p>
                    }
                  </div>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <button type="button" class="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" (click)="adjustComboQty($index, -1)" aria-label="Decrease quantity">
                      <app-icon name="remove" size="sm" />
                    </button>
                    <span class="w-6 text-center text-sm font-medium tabular-nums">{{ row.quantity }}</span>
                    <button type="button" class="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" (click)="adjustComboQty($index, 1)" aria-label="Increase quantity">
                      <app-icon name="add" size="sm" />
                    </button>
                  </div>
                  @if (productById(row.productId)) {
                    <p class="font-semibold shrink-0 tabular-nums text-sm w-14 text-right text-accent">{{ comboLineTotal(row) | inr }}</p>
                  }
                  @if (comboForm.items.length > 1) {
                    <button type="button" class="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-status-danger hover:bg-[rgba(215,0,21,0.08)] transition-colors shrink-0" (click)="removeComboItemRow($index)" aria-label="Remove item">
                      <app-icon name="close" size="sm" />
                    </button>
                  }
                </div>
              } @empty {
                <p class="text-text-muted text-sm py-4 text-center">Add at least one product</p>
              }
            </section>

            <section class="px-5 py-4 border-b border-border-subtle">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between text-text-secondary">
                  <span>Items value</span>
                  <span class="tabular-nums">{{ comboItemsSubtotal() | inr }}</span>
                </div>
                @if (comboSavings() > 0) {
                  <div class="flex justify-between text-status-active">
                    <span>Customer saves</span>
                    <span class="tabular-nums">−{{ comboSavings() | inr }}</span>
                  </div>
                }
                <div class="flex items-center justify-between pt-3 mt-2 border-t border-dashed border-border-medium">
                  <span class="font-medium">Combo price</span>
                  <span class="text-xl font-semibold tabular-nums text-accent">
                    @if (comboForm.price != null && comboForm.price >= 0) {
                      {{ comboForm.price | inr }}
                    } @else {
                      ₹—
                    }
                  </span>
                </div>
              </div>
            </section>

            <div class="sticky bottom-0 flex gap-2 p-5 bg-bg-primary border-t border-border-subtle">
              <button type="button" class="btn-secondary flex-1 min-h-0 py-3 text-xs" (click)="closeComboModal()">Cancel</button>
              <button type="submit" class="btn-primary flex-1 min-h-0 py-3 text-xs" [disabled]="comboSaving()">
                {{ comboSaving() ? 'Saving…' : comboModalMode() === 'create' ? 'Add combo' : 'Save changes' }}
              </button>
            </div>
          </form>
          <div class="pb-6"></div>
        </div>
      </div>
    }
  `,
})
export class ProductsListComponent implements OnInit {
  private productService = inject(ProductService);
  private comboService = inject(ComboService);
  private snackbar = inject(SnackbarService);
  private pageActionsService = inject(PageActionsService);

  activeTab = signal<PageTab>('products');
  loading = signal(true);
  products = signal<Product[]>([]);
  combos = signal<Combo[]>([]);
  modalOpen = signal(false);
  modalAnimOpen = signal(false);
  comboModalOpen = signal(false);
  comboModalAnimOpen = signal(false);
  private modalClosing = false;
  private comboModalClosing = false;
  modalMode = signal<ModalMode>('create');
  comboModalMode = signal<ComboModalMode>('create');
  editingProduct = signal<Product | null>(null);
  editingCombo = signal<Combo | null>(null);
  saving = signal(false);
  comboSaving = signal(false);
  confirmDeleteId = signal<string | null>(null);
  confirmDeleteComboId = signal<string | null>(null);
  fieldErrors = signal(new Set<string>());

  form: ProductFormValue = this.emptyForm();
  comboForm: ComboFormValue = this.emptyComboForm();

  productGroups = computed(() => collectGroups(this.products()));

  allGroups = computed(() => {
    const fromProducts = collectGroups(this.products());
    const typed = normalizeGroup(this.form.category);
    if (typed && !fromProducts.includes(typed)) {
      return sortWithNewGroup(fromProducts, typed);
    }
    return fromProducts;
  });

  readonly groupLabel = groupLabel;

  onHeaderAdd() {
    if (this.activeTab() === 'products') {
      this.openCreate();
    } else {
      this.openCreateCombo();
    }
  }

  ngOnInit() {
    this.pageActionsService.set(
      [{ kind: 'button', label: 'Add', icon: 'add', id: 'add', primary: true }],
      { add: () => this.onHeaderAdd() },
    );
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.loading.set(false);
    };
    this.productService.getAll().pipe(finalize(() => done())).subscribe((p) => this.products.set(p));
    this.comboService.getAll().pipe(finalize(() => done())).subscribe((c) => this.combos.set(c));
  }

  getByGroup(group: string) {
    return this.products().filter((p) => p.category === group);
  }

  private openSheet(setOpen: () => void, setAnim: (v: boolean) => void) {
    setOpen();
    setAnim(false);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnim(true));
    });
  }

  openCreate() {
    this.modalMode.set('create');
    this.editingProduct.set(null);
    this.form = this.emptyForm();
    this.fieldErrors.set(new Set());
    this.modalClosing = false;
    this.openSheet(() => this.modalOpen.set(true), (v) => this.modalAnimOpen.set(v));
  }

  openEdit(product: Product) {
    this.modalMode.set('edit');
    this.editingProduct.set(product);
    this.form = {
      name: product.name,
      category: product.category,
      description: product.description ?? '',
      mustTry: product.mustTry ?? false,
      price: product.price,
    };
    this.fieldErrors.set(new Set());
    this.modalClosing = false;
    this.openSheet(() => this.modalOpen.set(true), (v) => this.modalAnimOpen.set(v));
  }

  closeModal() {
    if (!this.modalOpen() || this.modalClosing) return;
    this.modalClosing = true;
    this.modalAnimOpen.set(false);
    const closeMs = transitionMs('--modal-close-dur', 300);
    setTimeout(() => {
      this.modalOpen.set(false);
      this.editingProduct.set(null);
      this.form = this.emptyForm();
      this.fieldErrors.set(new Set());
      this.modalClosing = false;
      document.body.style.overflow = '';
    }, closeMs);
  }

  saveProduct() {
    const valid = validateRequiredFields(
      [
        { id: 'product-name', label: 'name', valid: () => !!this.form.name.trim() },
        { id: 'product-price', label: 'price', valid: () => this.form.price !== null && this.form.price >= 0 },
      ],
      this.snackbar
    );
    if (!valid) {
      this.fieldErrors.set(
        new Set(
          ['name', 'price'].filter((f) => {
            if (f === 'name') return !this.form.name.trim();
            return this.form.price === null || this.form.price < 0;
          })
        )
      );
      return;
    }

    this.fieldErrors.set(new Set());

    const payload = {
      name: this.form.name.trim(),
      category: normalizeGroup(this.form.category),
      description: this.form.description.trim() || undefined,
      mustTry: this.form.mustTry,
      price: Number(this.form.price),
    };

    this.saving.set(true);
    const request =
      this.modalMode() === 'create'
        ? this.productService.create(payload)
        : this.productService.update(this.editingProduct()!._id, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackbar.success(this.modalMode() === 'create' ? 'Product added' : 'Product updated');
        this.closeModal();
        this.loadProducts();
      },
      error: () => {
        this.saving.set(false);
        this.snackbar.error('Could not save product');
      },
    });
  }

  askDelete(id: string) {
    this.confirmDeleteId.set(id);
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
  }

  deleteProduct(product: Product) {
    this.productService.delete(product._id).subscribe({
      next: () => {
        this.confirmDeleteId.set(null);
        this.snackbar.success('Product removed');
        this.loadProducts();
      },
      error: () => this.snackbar.error('Could not delete product'),
    });
  }

  openCreateCombo() {
    this.comboModalMode.set('create');
    this.editingCombo.set(null);
    this.comboForm = this.emptyComboForm();
    this.comboModalClosing = false;
    this.openSheet(() => this.comboModalOpen.set(true), (v) => this.comboModalAnimOpen.set(v));
  }

  openEditCombo(combo: Combo) {
    this.comboModalMode.set('edit');
    this.editingCombo.set(combo);
    this.comboForm = {
      name: combo.name,
      description: combo.description ?? '',
      mustTry: isComboMustTry(combo),
      price: combo.price,
      items: combo.items.map((item) => ({
        productId: typeof item.productId === 'object' ? item.productId._id : item.productId,
        quantity: item.quantity,
      })),
    };
    this.comboModalClosing = false;
    this.openSheet(() => this.comboModalOpen.set(true), (v) => this.comboModalAnimOpen.set(v));
  }

  closeComboModal() {
    if (!this.comboModalOpen() || this.comboModalClosing) return;
    this.comboModalClosing = true;
    this.comboModalAnimOpen.set(false);
    const closeMs = transitionMs('--modal-close-dur', 300);
    setTimeout(() => {
      this.comboModalOpen.set(false);
      this.editingCombo.set(null);
      this.comboForm = this.emptyComboForm();
      this.comboModalClosing = false;
      document.body.style.overflow = '';
    }, closeMs);
  }

  addComboItemRow() {
    this.comboForm.items = [...this.comboForm.items, { productId: '', quantity: 1 }];
  }

  removeComboItemRow(index: number) {
    if (this.comboForm.items.length <= 1) return;
    this.comboForm.items = this.comboForm.items.filter((_, i) => i !== index);
  }

  productById(id: string): Product | undefined {
    if (!id) return undefined;
    return this.products().find((p) => p._id === id);
  }

  comboLineTotal(row: { productId: string; quantity: number }): number {
    const product = this.productById(row.productId);
    if (!product) return 0;
    return product.price * row.quantity;
  }

  comboItemsSubtotal(): number {
    return this.comboForm.items.reduce((sum, row) => sum + this.comboLineTotal(row), 0);
  }

  comboSavings(): number {
    const subtotal = this.comboItemsSubtotal();
    const price = this.comboForm.price ?? 0;
    return subtotal > price ? subtotal - price : 0;
  }

  adjustComboQty(index: number, delta: number) {
    this.comboForm.items = this.comboForm.items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, quantity: Math.max(1, item.quantity + delta) };
    });
  }

  comboItemsLabel(combo: Combo): string {
    return combo.items
      .map((item) => {
        const name = typeof item.productId === 'object' ? item.productId.name : 'Item';
        return item.quantity > 1 ? `${item.quantity}× ${name}` : name;
      })
      .join(' · ');
  }

  isMustTryCombo = isComboMustTry;

  saveCombo() {
    if (!this.comboForm.name.trim()) {
      this.snackbar.error('Combo name is required');
      return;
    }
    if (this.comboForm.price === null || this.comboForm.price < 0) {
      this.snackbar.error('Valid combo price is required');
      return;
    }
    const items = this.comboForm.items.filter((item) => item.productId && item.quantity > 0);
    if (!items.length) {
      this.snackbar.error('Add at least one product to the combo');
      return;
    }

    const payload = {
      name: this.comboForm.name.trim(),
      description: this.comboForm.description.trim() || undefined,
      mustTry: this.comboForm.mustTry,
      price: Number(this.comboForm.price),
      items,
    };

    this.comboSaving.set(true);
    const request =
      this.comboModalMode() === 'create'
        ? this.comboService.create(payload)
        : this.comboService.update(this.editingCombo()!._id, payload);

    request.subscribe({
      next: () => {
        this.comboSaving.set(false);
        this.snackbar.success(this.comboModalMode() === 'create' ? 'Combo added' : 'Combo updated');
        this.closeComboModal();
        this.loadCombos();
      },
      error: (err) => {
        this.comboSaving.set(false);
        this.snackbar.error(err.error?.error || 'Could not save combo');
      },
    });
  }

  askDeleteCombo(id: string) {
    this.confirmDeleteComboId.set(id);
  }

  cancelDeleteCombo() {
    this.confirmDeleteComboId.set(null);
  }

  deleteCombo(combo: Combo) {
    this.comboService.deactivate(combo._id).subscribe({
      next: () => {
        this.confirmDeleteComboId.set(null);
        this.snackbar.success('Combo removed');
        this.loadCombos();
      },
      error: () => this.snackbar.error('Could not delete combo'),
    });
  }

  private loadProducts() {
    this.productService.getAll().subscribe((p) => this.products.set(p));
  }

  private loadCombos() {
    this.comboService.getAll().subscribe((c) => this.combos.set(c));
  }

  private emptyForm(): ProductFormValue {
    return { name: '', category: '', description: '', mustTry: false, price: null };
  }

  private emptyComboForm(): ComboFormValue {
    return { name: '', description: '', mustTry: false, price: null, items: [{ productId: '', quantity: 1 }] };
  }
}

function sortWithNewGroup(groups: string[], newGroup: string): string[] {
  return collectGroups([...groups.map((g) => ({ category: g })), { category: newGroup }]);
}
