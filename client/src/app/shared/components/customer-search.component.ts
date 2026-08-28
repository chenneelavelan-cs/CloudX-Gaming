import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Customer, CustomerFormValue } from '../models';
import { rankCustomers } from '../utils/customer-ranking';
import { validateRequiredFields } from '../utils/form-validation';
import { IconComponent } from './icon.component';
import { TabsSlidingDirective, OpenCloseDirective, InlineLoaderComponent } from '../transitions';

@Component({
  selector: 'app-customer-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TabsSlidingDirective, OpenCloseDirective, InlineLoaderComponent],
  styles: [
    `
      .customer-match-highlight {
        @apply bg-accent/10;
      }
      .search-field {
        @apply relative;
      }
      .search-dropdown {
        @apply absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-lg border border-border bg-bg-primary shadow-lg shadow-black/30;
      }
    `,
  ],
  template: `
    <div class="space-y-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label class="label mb-0">{{ label }}</label>
        <div
          class="app-tabs app-tabs--compact shrink-0 self-start sm:self-auto"
          role="tablist"
          [tTabsActiveIndex]="linkExisting() ? 0 : 1"
        >
          <span class="t-tabs-pill" aria-hidden="true"></span>
          <button
            type="button"
            class="t-tab"
            role="tab"
            [attr.aria-selected]="linkExisting()"
            (click)="setLinkExisting(true)"
          >
            <app-icon name="person_search" size="sm" />
            Link existing
          </button>
          <button
            type="button"
            class="t-tab"
            role="tab"
            [attr.aria-selected]="!linkExisting()"
            (click)="setLinkExisting(false)"
          >
            <app-icon name="edit_note" size="sm" />
            Enter manually
          </button>
        </div>
      </div>

      @if (linkExisting()) {
        <div class="search-field">
          @if (selectedCustomer() && !showDropdown()) {
            <div class="input flex items-center gap-2 min-h-[48px] cursor-text" (click)="reopenSearch()">
              <app-icon name="check_circle" size="sm" class="text-status-active shrink-0" />
              <span class="font-medium truncate">{{ selectedCustomer()!.name }}</span>
              <span class="text-text-muted text-sm font-mono truncate">{{ selectedCustomer()!.phone }}</span>
              <button
                type="button"
                (click)="clearLinked($event)"
                class="text-text-muted hover:text-text-primary ml-auto shrink-0 p-1 rounded-md hover:bg-white/[0.06]"
              >
                <app-icon name="close" size="sm" />
              </button>
            </div>
          } @else {
            <div class="relative t-input-wrap">
              <div class="t-input relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <app-icon name="search" size="sm" />
                </span>
                <input
                  type="text"
                  class="input !pl-11 t-clear-input"
                  [class.has-value]="!!query.trim()"
                  [placeholder]="placeholder"
                  [(ngModel)]="query"
                  (input)="onSearchInput()"
                  (focus)="onSearchFocus()"
                  (blur)="onBlur()"
                />
                @if (query.trim()) {
                  <button
                    type="button"
                    class="t-clear-btn absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                    (mousedown)="clearQuery($event)"
                    aria-label="Clear search"
                  >
                    <app-icon name="close" size="sm" />
                  </button>
                }
              </div>
            </div>

            @if (showDropdown()) {
              <div
                class="search-dropdown t-dropdown"
                data-origin="top-center"
                [class.is-open]="dropdownOpen()"
                [tOpenClose]="dropdownOpen()"
              >
                @if (loading() && rankedResults().length === 0) {
                  <app-inline-loader label="Loading customers…" [compact]="true" />
                } @else if (rankedResults().length === 0) {
                  <p class="px-4 py-3 text-sm text-text-muted">
                    {{ query.trim() ? 'No customers found' : 'No customers yet' }}
                  </p>
                } @else {
                  @for (c of rankedResults(); track c._id) {
                    <button
                      type="button"
                      (mousedown)="selectCustomer(c)"
                      class="w-full text-left px-4 py-3 hover:bg-white/[0.04] border-b border-border-subtle last:border-b-0 flex items-center gap-3"
                    >
                      <div class="flex-1 min-w-0">
                        <p class="font-medium truncate">{{ c.name }}</p>
                        @if (c.totalVisits > 0) {
                          <p class="text-text-muted text-xs mt-0.5">{{ c.totalVisits }} visit{{ c.totalVisits === 1 ? '' : 's' }}</p>
                        }
                      </div>
                      <span class="text-text-muted text-sm shrink-0 font-mono">{{ c.phone }}</span>
                    </button>
                  }
                }
              </div>
            }
          }
        </div>
      } @else {
        <div class="space-y-3">
          <div class="t-input-wrap">
            <label class="label">Name</label>
            <input
              [id]="nameFieldId"
              class="input t-input"
              [(ngModel)]="manualName"
              (ngModelChange)="onManualChange()"
              placeholder="Customer name"
            />
          </div>
          <div class="t-input-wrap">
            <label class="label">Phone</label>
            <input
              [id]="phoneFieldId"
              class="input t-input"
              [(ngModel)]="manualPhone"
              (ngModelChange)="onManualChange()"
              placeholder="Phone number"
            />
            @if (addError()) {
              <p class="t-error-msg text-status-danger text-xs mt-1">{{ addError() }}</p>
            }
          </div>
          @if (manualSaved()) {
            <p class="text-status-active text-xs flex items-center gap-1">
              <app-icon name="check_circle" size="sm" />
              Customer saved to directory
            </p>
          }
          <button
            type="button"
            (click)="createCustomer()"
            class="btn-secondary w-full text-sm py-2 min-h-0"
            [disabled]="adding()"
          >
            <app-icon name="person_add" size="sm" />
            {{ adding() ? 'Adding...' : 'Add customer' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class CustomerSearchComponent {
  private customerService = inject(CustomerService);
  private snackbar = inject(SnackbarService);

  @Input() label = 'Customer (optional)';
  @Input() placeholder = 'Search by name or phone...';
  @Input() required = false;
  @Input() nameFieldId = 'customer-name-field';
  @Input() phoneFieldId = 'customer-phone-field';
  @Input() set initialCustomer(value: CustomerFormValue | null | undefined) {
    if (!value?.name && !value?.phone && !value?.customerId) return;
    this.applyInitialCustomer(value);
  }
  @Output() customerChange = new EventEmitter<CustomerFormValue | null>();

  linkExisting = signal(true);
  query = '';
  manualName = '';
  manualPhone = '';
  allResults = signal<Customer[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  showDropdown = signal(false);
  dropdownOpen = signal(false);
  loading = signal(false);
  adding = signal(false);
  addError = signal('');
  manualSaved = signal(false);

  private searchDebounce?: ReturnType<typeof setTimeout>;
  private searchRequestId = 0;

  rankedResults = () => rankCustomers(this.allResults(), this.query);

  setLinkExisting(linked: boolean) {
    if (this.linkExisting() === linked) return;
    this.linkExisting.set(linked);
    this.resetState();
    this.customerChange.emit(null);
  }

  reopenSearch() {
    this.selectedCustomer.set(null);
    this.query = '';
    this.customerChange.emit(null);
    this.showDropdown.set(true);
    this.fetchCustomers('');
  }

  onSearchFocus() {
    this.showDropdown.set(true);
    this.dropdownOpen.set(true);
    if (!this.allResults().length) {
      this.fetchCustomers('');
    }
  }

  onSearchInput() {
    this.selectedCustomer.set(null);
    this.emitLinked(null);
    this.showDropdown.set(true);
    this.dropdownOpen.set(true);

    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.fetchCustomers(this.query.trim());
    }, 200);
  }

  fetchCustomers(q: string) {
    const requestId = ++this.searchRequestId;
    this.loading.set(true);
    this.customerService.search(q, 1, 50).subscribe({
      next: (res) => {
        if (requestId !== this.searchRequestId) return;
        this.loading.set(false);
        this.allResults.set(res.items);
      },
      error: () => {
        if (requestId !== this.searchRequestId) return;
        this.loading.set(false);
      },
    });
  }

  selectCustomer(c: Customer) {
    this.selectedCustomer.set(c);
    this.query = c.name;
    this.showDropdown.set(false);
    this.dropdownOpen.set(false);
    this.emitLinked(c);
  }

  clearQuery(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.query = '';
    this.selectedCustomer.set(null);
    this.emitLinked(null);
    this.fetchCustomers('');
  }

  clearLinked(event?: Event) {
    event?.stopPropagation();
    this.selectedCustomer.set(null);
    this.query = '';
    this.allResults.set([]);
    this.customerChange.emit(null);
  }

  onManualChange() {
    this.manualSaved.set(false);
    this.addError.set('');
    const name = this.manualName.trim();
    const phone = this.manualPhone.trim();
    if (!name && !phone) {
      this.customerChange.emit(null);
      return;
    }
    this.customerChange.emit({ linked: false, name, phone });
  }

  createCustomer() {
    if (
      !validateRequiredFields(
        [
          { id: this.nameFieldId, label: 'Customer Name', valid: () => !!this.manualName.trim() },
          { id: this.phoneFieldId, label: 'Phone', valid: () => !!this.manualPhone.trim() },
        ],
        this.snackbar
      )
    ) {
      return;
    }

    const name = this.manualName.trim();
    const phone = this.manualPhone.trim();

    this.adding.set(true);
    this.addError.set('');
    this.customerService.create({ name, phone }).subscribe({
      next: (c) => {
        this.adding.set(false);
        this.manualSaved.set(true);
        this.snackbar.success('Customer added');
        this.customerChange.emit({ linked: false, customerId: c._id, name: c.name, phone: c.phone });
      },
      error: (err) => {
        this.adding.set(false);
        const existingId = err.error?.existingId;
        if (existingId) {
          this.customerService.getById(existingId).subscribe((c) => {
            this.manualName = c.name;
            this.manualPhone = c.phone;
            this.manualSaved.set(true);
            this.snackbar.warning('Customer with this name and phone already exists — linked existing record');
            this.customerChange.emit({ linked: false, customerId: c._id, name: c.name, phone: c.phone });
          });
          return;
        }
        const msg = err.error?.error || 'Failed to add customer';
        this.addError.set(msg);
        this.snackbar.error(msg);
      },
    });
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown.set(false);
      this.dropdownOpen.set(false);
    }, 150);
  }

  private emitLinked(c: Customer | null) {
    if (!c) {
      this.customerChange.emit(null);
      return;
    }
    this.customerChange.emit({
      linked: true,
      customerId: c._id,
      name: c.name,
      phone: c.phone,
    });
  }

  private resetState() {
    this.query = '';
    this.manualName = '';
    this.manualPhone = '';
    this.allResults.set([]);
    this.selectedCustomer.set(null);
    this.showDropdown.set(false);
    this.dropdownOpen.set(false);
    this.addError.set('');
    this.manualSaved.set(false);
  }

  private applyInitialCustomer(value: CustomerFormValue) {
    if (value.linked && value.customerId) {
      this.linkExisting.set(true);
      this.selectedCustomer.set({
        _id: value.customerId,
        name: value.name,
        phone: value.phone,
        totalVisits: 0,
        totalSpending: 0,
      });
      this.query = value.name;
      this.showDropdown.set(false);
      this.customerChange.emit(value);
      return;
    }

    if (value.name || value.phone) {
      this.linkExisting.set(false);
      this.manualName = value.name;
      this.manualPhone = value.phone;
      this.customerChange.emit(value);
    }
  }
}
