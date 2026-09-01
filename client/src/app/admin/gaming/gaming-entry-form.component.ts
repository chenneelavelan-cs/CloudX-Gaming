import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GamingService } from '../../core/services/domain.service';
import { GamingOption, GamingResource, CustomerFormValue, PricingResult } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { CustomerSearchComponent } from '../../shared/components/customer-search.component';
import { filterResourcesForOption, resourceSelectLabel } from '../../shared/utils/resource-display';
import { applyDefaultGamingOption } from '../../shared/utils/gaming-defaults';
import { getDurationOptions } from '../../shared/utils/duration-options';
import { gamingOptionIcon } from '../../shared/utils/session-display';
import { SnackbarService } from '../../core/services/snackbar.service';
import { validateRequiredFields } from '../../shared/utils/form-validation';

@Component({
  selector: 'app-gaming-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InrPipe, DurationPipe, IconComponent, CustomerSearchComponent],
  template: `
    <div class="form-page">
      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <section class="form-card">
          <app-customer-search (customerChange)="onCustomerChange($event)" />
        </section>

        <section class="form-card">
          <div class="form-card-header">
            <div class="form-card-icon form-card-icon-accent">
              <app-icon name="sports_esports" size="sm" />
            </div>
            <div class="form-card-copy">
              <p class="form-card-title">Session</p>
              <p class="form-card-hint">Option, station, players, and duration</p>
            </div>
          </div>

          <div>
            <label class="label">Gaming option</label>
            <div id="gaming-option" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              @for (opt of options(); track opt._id) {
                <button
                  type="button"
                  (click)="selectOption(opt._id)"
                  [class]="optionTileClass(opt._id)"
                >
                  <span class="option-tile-icon">
                    <app-icon [name]="optionIcon(opt.name)" size="sm" />
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
          </div>

          @if (form.gamingOptionId) {
            <div>
              <label class="label">{{ resourceFieldLabel() }}</label>
              <div class="select-wrap has-leading-icon">
                <span class="select-icon">
                  <app-icon [name]="resourceFieldLabel() === 'TV' ? 'tv' : 'memory'" size="sm" />
                </span>
                <select id="gaming-resource" class="input" [(ngModel)]="form.resourceId" name="resource">
                  <option value="">Select {{ resourceFieldLabel().toLowerCase() }}</option>
                  @for (res of filteredResources(); track res._id) {
                    <option [value]="res._id">{{ resourceLabel(res) }}</option>
                  }
                </select>
                <span class="select-chevron">
                  <app-icon name="expand_more" size="sm" />
                </span>
              </div>
            </div>
          }

          @if (selectedOption()?.supportsPlayerPricing) {
            <div>
              <label class="label">Players</label>
              <div class="choice-row">
                @for (p of playerOptions(); track p) {
                  <button
                    type="button"
                    (click)="form.playerCount = p; recalculatePrice()"
                    [class]="chipClass(form.playerCount === p)"
                  >
                    {{ p }}
                  </button>
                }
              </div>
            </div>
          }

          <div>
            <label class="label">Duration</label>
            <div class="choice-row">
              @for (d of durationOptions(); track d) {
                <button
                  type="button"
                  (click)="form.durationMinutes = d; recalculatePrice()"
                  [class]="chipClass(form.durationMinutes === d)"
                >
                  {{ d | duration }}
                </button>
              }
            </div>
          </div>
        </section>

        @if (pricing()) {
          <div class="price-card">
            <div class="price-card-main">
              <div class="price-card-header">
                <app-icon name="payments" size="sm" class="text-accent/70" />
                <span class="price-card-label">Suggested price</span>
              </div>
              <p class="price-card-amount">{{ pricing()!.price | inr }}</p>
              <p class="price-card-breakdown">{{ pricing()!.breakdown }}</p>
            </div>
            <div class="price-card-footer">
              <label class="label mb-2" for="price-override">Custom amount</label>
              <div class="price-currency-input-wrap">
                <span class="price-currency-prefix">₹</span>
                <input
                  id="price-override"
                  type="number"
                  class="price-currency-input"
                  [(ngModel)]="priceOverride"
                  name="override"
                  placeholder="Use suggested price"
                  min="0"
                />
              </div>
            </div>
          </div>
        }

        @if (error()) {
          <div class="text-status-danger text-sm">{{ error() }}</div>
        }

        <div class="form-actions">
          <button type="submit" class="btn-primary w-full" [disabled]="submitting() || !canSubmit()">
            <app-icon name="play_arrow" size="sm" />
            {{ submitting() ? 'Starting...' : 'Start Session' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class GamingEntryFormComponent implements OnInit {
  private gamingService = inject(GamingService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  options = signal<GamingOption[]>([]);
  resources = signal<GamingResource[]>([]);
  selectedCustomer = signal<CustomerFormValue | null>(null);
  pricing = signal<PricingResult | null>(null);
  submitting = signal(false);
  error = signal('');

  priceOverride: number | null = null;

  form = {
    gamingOptionId: '',
    resourceId: '',
    playerCount: 1,
    durationMinutes: 60,
  };

  ngOnInit() {
    this.gamingService.getOptions().subscribe((o) => {
      this.options.set(o);
      this.applyDefaultOption();
    });
    this.gamingService.getResources().subscribe((r) => this.resources.set(r));
  }

  onCustomerChange(customer: CustomerFormValue | null) {
    this.selectedCustomer.set(customer);
  }

  selectedOption = () => this.options().find((o) => o._id === this.form.gamingOptionId);

  filteredResources = () =>
    filterResourcesForOption(this.resources(), this.form.gamingOptionId, !!this.selectedOption()?.supportsPlayerPricing);

  resourceLabel = resourceSelectLabel;
  resourceFieldLabel = () => (this.selectedOption()?.supportsPlayerPricing ? 'TV' : 'Resource');
  optionIcon = gamingOptionIcon;

  chipClass(selected: boolean): string {
    return selected ? 'choice-chip choice-chip-active' : 'choice-chip';
  }

  optionTileClass(optionId: string): string {
    return `option-tile ${this.form.gamingOptionId === optionId ? 'option-tile-selected' : ''}`;
  }

  selectOption(optionId: string) {
    if (this.form.gamingOptionId === optionId) return;
    this.form.gamingOptionId = optionId;
    this.onOptionChange();
  }

  playerOptions = () => {
    const opt = this.selectedOption();
    if (!opt) return [1];
    return Array.from({ length: opt.maxPlayers - opt.minPlayers + 1 }, (_, i) => opt.minPlayers + i);
  };

  durationOptions = () => getDurationOptions(this.selectedOption(), 'entry');

  applyDefaultOption() {
    const defaultId = applyDefaultGamingOption(this.options());
    if (!defaultId) return;
    this.form.gamingOptionId = defaultId;
    this.onOptionChange();
  }

  onOptionChange() {
    this.form.resourceId = '';
    const opt = this.selectedOption();
    this.form.playerCount = opt?.minPlayers || 1;
    this.form.durationMinutes = opt?.minDurationMinutes || 60;
    this.recalculatePrice();
  }

  recalculatePrice() {
    if (!this.form.gamingOptionId || !this.form.durationMinutes) return;
    this.gamingService
      .calculatePrice(this.form.gamingOptionId, this.form.playerCount, this.form.durationMinutes)
      .subscribe((p) => this.pricing.set(p));
  }

  canSubmit() {
    return this.form.gamingOptionId && this.form.resourceId && this.form.durationMinutes;
  }

  onSubmit() {
    const resourceLabel = this.resourceFieldLabel();
    if (
      !validateRequiredFields(
        [
          { id: 'gaming-option', label: 'Gaming Option', valid: () => !!this.form.gamingOptionId },
          { id: 'gaming-resource', label: resourceLabel, valid: () => !!this.form.resourceId },
        ],
        this.snackbar
      )
    ) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const payload: Record<string, unknown> = {
      ...this.form,
      customerId: this.selectedCustomer()?.customerId,
      customerName: this.selectedCustomer()?.name,
      priceOverride: this.priceOverride ?? undefined,
    };

    this.gamingService.createGamingEntry(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackbar.success('Session started');
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err.error?.error || 'Failed to start session';
        this.error.set(msg);
        this.snackbar.error(msg);
      },
    });
  }
}
