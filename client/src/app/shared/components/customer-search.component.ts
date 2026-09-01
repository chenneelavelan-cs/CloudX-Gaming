import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Customer, CustomerFormValue } from '../models';
import { rankCustomers } from '../utils/customer-ranking';
import { validateRequiredFields } from '../utils/form-validation';
import { IconComponent } from './icon.component';
import { OpenCloseDirective, InlineLoaderComponent, transitionMs } from '../transitions';

@Component({
  selector: 'app-customer-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, OpenCloseDirective, InlineLoaderComponent],
  template: `
    <div class="customer-link" [class.is-open]="showDropdown()">
      <div class="customer-link-head">
        <span class="customer-link-label">
          {{ label }}
          @if (required) {
            <span class="text-accent ml-0.5">*</span>
          }
        </span>
        <button type="button" class="customer-link-add" (click)="openAddDialog()">
          <app-icon name="person_add" size="sm" />
          New customer
        </button>
      </div>

      @if (selectedCustomer() && !showDropdown()) {
        <div class="customer-link-selected" (click)="reopenSearch()">
          <div class="customer-link-avatar">{{ initials(selectedCustomer()!.name) }}</div>
          <div class="min-w-0 flex-1">
            <p class="customer-link-name">{{ selectedCustomer()!.name }}</p>
            <p class="customer-link-phone">{{ selectedCustomer()!.phone }}</p>
          </div>
          <button
            type="button"
            class="customer-link-clear"
            (click)="clearLinked($event)"
            aria-label="Remove linked customer"
          >
            <app-icon name="close" size="sm" />
          </button>
        </div>
      } @else {
        <div class="customer-link-input-wrap">
          <span class="customer-link-input-icon">
            <app-icon name="search" size="sm" />
          </span>
          <input
            type="text"
            class="customer-link-input"
            [placeholder]="placeholder"
            [(ngModel)]="query"
            (input)="onSearchInput()"
            (focus)="onSearchFocus()"
            (blur)="onBlur()"
          />
          @if (query.trim()) {
            <button
              type="button"
              class="customer-link-input-clear"
              (mousedown)="clearQuery($event)"
              aria-label="Clear search"
            >
              <app-icon name="close" size="sm" />
            </button>
          }

          @if (showDropdown()) {
            <div
              class="customer-link-dropdown t-dropdown"
              data-origin="top-center"
              [class.is-open]="dropdownOpen()"
              [tOpenClose]="dropdownOpen()"
            >
              @if (loading() && rankedResults().length === 0) {
                <div class="px-4 py-3">
                  <app-inline-loader label="Searching…" [compact]="true" />
                </div>
              } @else if (rankedResults().length === 0) {
                <div class="px-4 py-5 text-center">
                  <p class="text-sm text-text-muted">
                    {{ query.trim() ? 'No matches' : 'No customers yet' }}
                  </p>
                  <button type="button" class="customer-link-add mt-2 justify-center w-full" (mousedown)="openAddDialogFromEmpty($event)">
                    Create customer
                  </button>
                </div>
              } @else {
                @for (c of rankedResults(); track c._id) {
                  <button type="button" class="customer-link-option" (mousedown)="selectCustomer(c)">
                    <div class="customer-link-option-avatar">{{ initials(c.name) }}</div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm truncate">{{ c.name }}</p>
                      @if (c.totalVisits > 0) {
                        <p class="text-text-muted text-xs mt-0.5">{{ c.totalVisits }} visit{{ c.totalVisits === 1 ? '' : 's' }}</p>
                      }
                    </div>
                    <span class="text-text-muted text-xs font-mono shrink-0">{{ c.phone }}</span>
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>

    @if (addDialogOpen()) {
      <div class="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="add-customer-title">
        <div
          class="bottom-sheet-backdrop"
          [class.opacity-100]="addDialogAnimOpen()"
          [class.opacity-0]="!addDialogAnimOpen()"
          [class.pointer-events-none]="!addDialogAnimOpen()"
          (click)="closeAddDialog()"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div
            class="rounded-2xl border border-border bg-bg-primary w-full max-w-sm !p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-auto shadow-2xl shadow-black/50"
            [class.opacity-100]="addDialogAnimOpen()"
            [class.scale-100]="addDialogAnimOpen()"
            [class.opacity-0]="!addDialogAnimOpen()"
            [class.scale-95]="!addDialogAnimOpen()"
            [class.pointer-events-none]="!addDialogAnimOpen()"
            (click)="$event.stopPropagation()"
          >
            <h2 id="add-customer-title" class="font-semibold text-lg mb-0.5">New customer</h2>
            <p class="text-text-muted text-sm mb-5">Create and link to this record.</p>

            <div class="space-y-3 mb-5">
              <div>
                <label class="label" [for]="nameFieldId">Name</label>
                <input [id]="nameFieldId" class="input" [(ngModel)]="manualName" placeholder="Customer name" autocomplete="off" />
              </div>
              <div>
                <label class="label" [for]="phoneFieldId">Phone</label>
                <input [id]="phoneFieldId" class="input" [(ngModel)]="manualPhone" placeholder="Phone number" autocomplete="off" />
                @if (addError()) {
                  <p class="text-status-danger text-xs mt-1">{{ addError() }}</p>
                }
              </div>
            </div>

            <button type="button" class="btn-primary w-full text-sm mb-2" [disabled]="adding()" (click)="createCustomer()">
              <app-icon name="person_add" size="sm" />
              {{ adding() ? 'Creating…' : 'Create & link' }}
            </button>
            <button type="button" class="btn-secondary w-full text-sm" (click)="closeAddDialog()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CustomerSearchComponent {
  private customerService = inject(CustomerService);
  private snackbar = inject(SnackbarService);

  @Input() label = 'Customer';
  @Input() placeholder = 'Search name or phone…';
  @Input() required = false;
  @Input() nameFieldId = 'customer-name-field';
  @Input() phoneFieldId = 'customer-phone-field';
  @Input() set initialCustomer(value: CustomerFormValue | null | undefined) {
    if (!value?.name && !value?.phone && !value?.customerId) return;
    this.applyInitialCustomer(value);
  }
  @Output() customerChange = new EventEmitter<CustomerFormValue | null>();

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

  addDialogOpen = signal(false);
  addDialogAnimOpen = signal(false);
  private addDialogClosing = false;

  private searchDebounce?: ReturnType<typeof setTimeout>;
  private searchRequestId = 0;

  rankedResults = () => rankCustomers(this.allResults(), this.query);

  openAddDialog() {
    this.addDialogClosing = false;
    this.manualName = '';
    this.manualPhone = '';
    this.addError.set('');
    this.addDialogOpen.set(true);
    this.addDialogAnimOpen.set(false);
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.addDialogAnimOpen.set(true), 16);
  }

  openAddDialogFromEmpty(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showDropdown.set(false);
    this.dropdownOpen.set(false);
    this.openAddDialog();
  }

  closeAddDialog() {
    if (!this.addDialogOpen() || this.addDialogClosing) return;
    this.addDialogClosing = true;
    this.addDialogAnimOpen.set(false);
    setTimeout(() => {
      this.addDialogOpen.set(false);
      this.addDialogClosing = false;
      document.body.style.overflow = '';
    }, transitionMs('--modal-close-dur', 300));
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
        this.snackbar.success('Customer added');
        this.closeAddDialog();
        this.selectCustomer(c);
      },
      error: (err) => {
        this.adding.set(false);
        const existingId = err.error?.existingId;
        if (existingId) {
          this.customerService.getById(existingId).subscribe((c) => {
            this.snackbar.warning('Customer already exists — linked');
            this.closeAddDialog();
            this.selectCustomer(c);
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

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
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

  private applyInitialCustomer(value: CustomerFormValue) {
    if (value.customerId) {
      this.selectedCustomer.set({
        _id: value.customerId,
        name: value.name,
        phone: value.phone,
        totalVisits: 0,
        totalSpending: 0,
      });
      this.query = value.name;
      this.showDropdown.set(false);
      this.customerChange.emit({
        linked: true,
        customerId: value.customerId,
        name: value.name,
        phone: value.phone,
      });
    }
  }
}
