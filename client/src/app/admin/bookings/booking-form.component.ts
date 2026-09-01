import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService, GamingService } from '../../core/services/domain.service';
import { GamingOption, GamingResource, PricingResult } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { CustomerSearchComponent } from '../../shared/components/customer-search.component';
import { CustomerFormValue } from '../../shared/models';
import { filterResourcesForOption, resourceSelectLabel } from '../../shared/utils/resource-display';
import { applyDefaultGamingOption } from '../../shared/utils/gaming-defaults';
import { getDurationOptions } from '../../shared/utils/duration-options';
import { gamingOptionIcon } from '../../shared/utils/session-display';
import { SnackbarService } from '../../core/services/snackbar.service';
import { validateRequiredFields } from '../../shared/utils/form-validation';
import { InlineLoaderComponent } from '../../shared/transitions';

interface BookingSessionLine {
  gamingOptionId: string;
  resourceId: string;
  playerCount: number;
  durationMinutes: number;
  name: string;
  description: string;
  suggestedPrice: number;
}

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, InrPipe, DurationPipe, IconComponent, CustomerSearchComponent, InlineLoaderComponent],
  styles: [
    `
      .danger-zone {
        @apply rounded-xl border border-status-danger/20 bg-status-danger/[0.04] p-3 space-y-2;
      }
      .danger-zone-label {
        @apply text-[10px] font-semibold uppercase tracking-caption text-status-danger/70 px-1;
      }
      .danger-action-row {
        @apply flex gap-2;
      }
      .danger-btn {
        @apply flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-nav transition-colors min-h-[44px];
      }
      .danger-btn-cancel {
        @apply bg-status-danger/10 text-status-danger border border-status-danger/25 hover:bg-status-danger/15;
      }
      .danger-btn-noshow {
        @apply bg-white/[0.03] text-text-secondary border border-border hover:bg-white/[0.06] hover:text-text-primary;
      }
    `,
  ],
  template: `
    <div class="form-page">
      @if (loading()) {
        <app-inline-loader label="Loading booking…" />
      } @else {
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <section class="form-card">
            <app-customer-search
              label="Customer"
              [required]="true"
              [initialCustomer]="draftCustomer()"
              nameFieldId="booking-customer-name"
              phoneFieldId="booking-customer-phone"
              (customerChange)="onCustomerChange($event)"
            />
          </section>

          <section class="form-card">
            <div class="form-card-header">
              <div class="form-card-icon form-card-icon-accent">
                <app-icon name="calendar_today" size="sm" />
              </div>
              <div class="form-card-copy">
                <p class="form-card-title">Schedule</p>
                <p class="form-card-hint">When the session starts</p>
              </div>
            </div>

            <div>
              <label class="label">Date & time</label>
              <div class="select-wrap has-leading-icon">
                <span class="select-icon">
                  <app-icon name="calendar_today" size="sm" />
                </span>
                <input
                  id="booking-scheduled-start"
                  type="datetime-local"
                  class="input"
                  [(ngModel)]="form.scheduledStart"
                  name="start"
                />
              </div>
            </div>

            <div>
              <label class="label" for="booking-notes">Notes</label>
              <input id="booking-notes" class="input" [(ngModel)]="form.notes" name="notes" placeholder="Special requests, etc." />
            </div>
          </section>

          @if (isEdit()) {
            <section class="form-card">
              <div class="form-card-header">
                <div class="form-card-icon form-card-icon-accent">
                  <app-icon name="sports_esports" size="sm" />
                </div>
                <div class="form-card-copy">
                  <p class="form-card-title">Session</p>
                  <p class="form-card-hint">Option, station, and players</p>
                </div>
              </div>

              <div>
                <label class="label">Gaming option</label>
                <div id="booking-gaming-option" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (opt of options(); track opt._id) {
                    <button type="button" (click)="selectOption(opt._id)" [class]="optionTileClass(opt._id)">
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
                    <select class="input" [(ngModel)]="form.resourceId" name="resource">
                      <option value="">Auto-assign later</option>
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

              <div>
                <label class="label">Duration</label>
                <div class="choice-row">
                  @for (d of durationOptions(); track d) {
                    <button type="button" (click)="form.durationMinutes = d; recalculatePrice()" [class]="chipClass(form.durationMinutes === d)">
                      {{ d | duration }}
                    </button>
                  }
                </div>
              </div>

              @if (selectedOption()?.supportsPlayerPricing) {
                <div>
                  <label class="label">Players</label>
                  <div class="choice-row">
                    @for (p of playerOptions(); track p) {
                      <button type="button" (click)="form.playerCount = p; recalculatePrice()" [class]="chipClass(form.playerCount === p)">
                        {{ p }}
                      </button>
                    }
                  </div>
                </div>
              }
            </section>

            @if (pricing()) {
              <div class="price-card">
                <div class="price-card-main">
                  <div class="price-card-header">
                    <app-icon name="payments" size="sm" class="text-accent/70" />
                    <span class="price-card-label">Estimated price</span>
                  </div>
                  <p class="price-card-amount">{{ pricing()!.price | inr }}</p>
                  <p class="price-card-breakdown">{{ pricing()!.breakdown }}</p>
                </div>
              </div>
            }
          } @else {
            @if (sessionItems().length === 0) {
              <div class="form-card text-center py-8">
                <div class="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.04] text-text-muted">
                  <app-icon name="sports_esports" size="lg" />
                </div>
                <p class="font-medium">No sessions yet</p>
                <p class="text-sm text-text-muted mt-1">Add gaming options below — e.g. 2 PCs and 2 PS5s</p>
              </div>
            } @else {
              <div class="space-y-2">
                @for (item of sessionItems(); track $index; let i = $index) {
                  <div class="session-line-item">
                    <div class="session-line-icon">
                      <app-icon [name]="optionIcon(item.name)" size="sm" />
                    </div>
                    <div class="session-line-body">
                      <div class="session-line-header">
                        <p class="session-line-name">{{ item.name }}</p>
                        <p class="session-line-amount">{{ item.suggestedPrice | inr }}</p>
                      </div>
                      <p class="session-line-meta">{{ item.description }}</p>
                    </div>
                    <button type="button" class="session-line-remove" (click)="removeSession(i)" aria-label="Remove session">
                      <app-icon name="close" size="sm" />
                    </button>
                  </div>
                }
              </div>
            }

            <div class="rounded-xl border border-border bg-white/[0.03] overflow-hidden">
              <div class="px-4 pt-4 pb-2 border-b border-border-subtle">
                <p class="section-heading mb-0">Add session</p>
              </div>
              <div class="p-4 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (opt of options(); track opt._id) {
                    <button type="button" (click)="selectDraftOption(opt._id)" [class]="draftOptionTileClass(opt._id)">
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

                @if (draftForm.gamingOptionId) {
                  <div>
                    <label class="label">{{ draftResourceFieldLabel() }}</label>
                    <div class="select-wrap has-leading-icon">
                      <span class="select-icon">
                        <app-icon [name]="draftResourceFieldLabel() === 'TV' ? 'tv' : 'memory'" size="sm" />
                      </span>
                      <select class="input" [(ngModel)]="draftForm.resourceId" name="draftResource" (ngModelChange)="recalculateDraftPrice()">
                        <option value="">Auto-assign later</option>
                        @for (res of draftFilteredResources(); track res._id) {
                          <option [value]="res._id">{{ resourceLabel(res) }}</option>
                        }
                      </select>
                      <span class="select-chevron">
                        <app-icon name="expand_more" size="sm" />
                      </span>
                    </div>
                  </div>

                  <div>
                    <label class="label">Duration</label>
                    <div class="choice-row">
                      @for (d of draftDurationOptions(); track d) {
                        <button type="button" (click)="draftForm.durationMinutes = d; recalculateDraftPrice()" [class]="chipClass(draftForm.durationMinutes === d)">
                          {{ d | duration }}
                        </button>
                      }
                    </div>
                  </div>

                  @if (draftSelectedOption()?.supportsPlayerPricing) {
                    <div>
                      <label class="label">Players</label>
                      <div class="choice-row">
                        @for (p of draftPlayerOptions(); track p) {
                          <button type="button" (click)="draftForm.playerCount = p; recalculateDraftPrice()" [class]="chipClass(draftForm.playerCount === p)">
                            {{ p }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  @if (draftPricing()) {
                    <div class="flex items-center justify-between gap-3 pt-1">
                      <div>
                        <p class="text-xs text-text-muted uppercase tracking-caption">Line price</p>
                        <p class="text-lg font-bold text-accent tabular-nums">{{ draftPricing()!.price | inr }}</p>
                      </div>
                      <button type="button" class="btn-primary text-sm py-2 px-4 min-h-0 shrink-0" (click)="addSession()">
                        <app-icon name="add" size="sm" />
                        Add
                      </button>
                    </div>
                  }
                }
              </div>
            </div>

            @if (sessionItems().length) {
              <div class="price-card">
                <div class="price-card-main">
                  <div class="price-card-header">
                    <app-icon name="payments" size="sm" class="text-accent/70" />
                    <span class="price-card-label">Total estimate · {{ sessionItems().length }} session{{ sessionItems().length === 1 ? '' : 's' }}</span>
                  </div>
                  <p class="price-card-amount">{{ totalEstimate() | inr }}</p>
                </div>
              </div>
            }
          }

          <div class="form-actions">
            <button type="submit" class="btn-primary w-full" [disabled]="submitting()">
              <app-icon name="event_available" size="sm" />
              @if (isEdit()) {
                {{ submitting() ? 'Saving…' : 'Save Changes' }}
              } @else {
                {{ submitting() ? 'Creating…' : sessionItems().length > 1 ? 'Create ' + sessionItems().length + ' Bookings' : 'Create Booking' }}
              }
            </button>
          </div>

          @if (isEdit()) {
            <div class="danger-zone">
              <p class="danger-zone-label">Booking actions</p>
              <div class="danger-action-row">
                <button type="button" class="danger-btn danger-btn-cancel" (click)="cancelBooking()" [disabled]="submitting()">
                  <app-icon name="event_busy" size="sm" />
                  Cancel booking
                </button>
                <button type="button" class="danger-btn danger-btn-noshow" (click)="markNoShow()" [disabled]="submitting()">
                  <app-icon name="person_off" size="sm" />
                  No show
                </button>
              </div>
            </div>
          }
        </form>
      }
    </div>
  `,
})
export class BookingFormComponent implements OnInit {
  private bookingService = inject(BookingService);
  private gamingService = inject(GamingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  options = signal<GamingOption[]>([]);
  resources = signal<GamingResource[]>([]);
  pricing = signal<PricingResult | null>(null);
  draftPricing = signal<PricingResult | null>(null);
  sessionItems = signal<BookingSessionLine[]>([]);
  submitting = signal(false);
  loading = signal(false);
  isEdit = signal(false);
  bookingId = signal<string | null>(null);

  customerDetails = signal<CustomerFormValue | null>(null);
  draftCustomer = signal<CustomerFormValue | null>(null);

  form = {
    gamingOptionId: '',
    resourceId: '',
    scheduledStart: '',
    durationMinutes: 60,
    playerCount: 1,
    notes: '',
  };

  draftForm = {
    gamingOptionId: '',
    resourceId: '',
    durationMinutes: 60,
    playerCount: 1,
  };

  totalEstimate = computed(() => this.sessionItems().reduce((sum, item) => sum + item.suggestedPrice, 0));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.bookingId.set(id);
      this.loading.set(true);
    }

    this.gamingService.getOptions().subscribe((o) => {
      this.options.set(o);
      if (!id) {
        this.applyDefaultDraftOption(o);
      } else {
        const defaultId = applyDefaultGamingOption(o);
        if (defaultId) {
          this.form.gamingOptionId = defaultId;
          this.onOptionChange();
        }
      }
    });
    this.gamingService.getResources().subscribe((r) => this.resources.set(r));

    if (id) {
      this.bookingService.getById(id).subscribe({
        next: (booking) => {
          if (!['scheduled', 'confirmed'].includes(booking.status)) {
            this.snackbar.error('This booking can no longer be edited');
            this.router.navigate(['/admin/bookings']);
            return;
          }
          this.form = {
            gamingOptionId: typeof booking.gamingOptionId === 'object' ? booking.gamingOptionId._id : booking.gamingOptionId,
            resourceId: booking.resourceId
              ? typeof booking.resourceId === 'object'
                ? booking.resourceId._id
                : booking.resourceId
              : '',
            scheduledStart: this.toDatetimeLocal(booking.scheduledStart),
            durationMinutes: booking.durationMinutes,
            playerCount: booking.playerCount,
            notes: booking.notes ?? '',
          };
          this.draftCustomer.set({
            linked: !!booking.customerId,
            customerId: typeof booking.customerId === 'object' ? booking.customerId._id : booking.customerId,
            name: booking.customerName,
            phone: booking.customerPhone,
          });
          this.recalculatePrice();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snackbar.error('Booking not found');
          this.router.navigate(['/admin/bookings']);
        },
      });
    }
  }

  filteredResources = () =>
    filterResourcesForOption(this.resources(), this.form.gamingOptionId, !!this.selectedOption()?.supportsPlayerPricing);

  draftFilteredResources = () =>
    filterResourcesForOption(this.resources(), this.draftForm.gamingOptionId, !!this.draftSelectedOption()?.supportsPlayerPricing);

  resourceLabel = resourceSelectLabel;
  selectedOption = () => this.options().find((o) => o._id === this.form.gamingOptionId);
  draftSelectedOption = () => this.options().find((o) => o._id === this.draftForm.gamingOptionId);
  resourceFieldLabel = () => (this.selectedOption()?.supportsPlayerPricing ? 'TV' : 'Resource');
  draftResourceFieldLabel = () => (this.draftSelectedOption()?.supportsPlayerPricing ? 'TV' : 'Resource');
  optionIcon = gamingOptionIcon;

  chipClass(selected: boolean): string {
    return selected ? 'choice-chip choice-chip-active' : 'choice-chip';
  }

  optionTileClass(optionId: string): string {
    return `option-tile ${this.form.gamingOptionId === optionId ? 'option-tile-selected' : ''}`;
  }

  draftOptionTileClass(optionId: string): string {
    return `option-tile ${this.draftForm.gamingOptionId === optionId ? 'option-tile-selected' : ''}`;
  }

  selectOption(optionId: string) {
    if (this.form.gamingOptionId === optionId) return;
    this.form.gamingOptionId = optionId;
    this.onOptionChange();
  }

  selectDraftOption(optionId: string) {
    if (this.draftForm.gamingOptionId === optionId) return;
    this.draftForm.gamingOptionId = optionId;
    this.onDraftOptionChange();
  }

  playerOptions = () => {
    const opt = this.selectedOption();
    if (!opt) return [1];
    return Array.from({ length: opt.maxPlayers - opt.minPlayers + 1 }, (_, i) => opt.minPlayers + i);
  };

  draftPlayerOptions = () => {
    const opt = this.draftSelectedOption();
    if (!opt) return [1];
    return Array.from({ length: opt.maxPlayers - opt.minPlayers + 1 }, (_, i) => opt.minPlayers + i);
  };

  durationOptions = () => getDurationOptions(this.selectedOption(), 'booking');
  draftDurationOptions = () => getDurationOptions(this.draftSelectedOption(), 'booking');

  onCustomerChange(details: CustomerFormValue | null) {
    this.customerDetails.set(details);
  }

  onOptionChange() {
    this.form.resourceId = '';
    const opt = this.selectedOption();
    this.form.playerCount = opt?.minPlayers || 1;
    this.form.durationMinutes = Math.max(opt?.minDurationMinutes || 60, this.form.durationMinutes);
    this.recalculatePrice();
  }

  onDraftOptionChange() {
    this.draftForm.resourceId = '';
    const opt = this.draftSelectedOption();
    this.draftForm.playerCount = opt?.minPlayers || 1;
    this.draftForm.durationMinutes = opt?.minDurationMinutes || 60;
    this.recalculateDraftPrice();
  }

  applyDefaultDraftOption(options: GamingOption[]) {
    const defaultId = applyDefaultGamingOption(options);
    if (!defaultId) return;
    this.draftForm.gamingOptionId = defaultId;
    this.onDraftOptionChange();
  }

  recalculatePrice() {
    if (!this.form.gamingOptionId) return;
    this.gamingService
      .calculatePrice(this.form.gamingOptionId, this.form.playerCount, this.form.durationMinutes)
      .subscribe((p) => this.pricing.set(p));
  }

  recalculateDraftPrice() {
    if (!this.draftForm.gamingOptionId) return;
    this.gamingService
      .calculatePrice(this.draftForm.gamingOptionId, this.draftForm.playerCount, this.draftForm.durationMinutes)
      .subscribe((p) => this.draftPricing.set(p));
  }

  addSession() {
    const opt = this.draftSelectedOption();
    const pricing = this.draftPricing();
    if (!opt || !pricing) return;

    const durationLabel = this.formatDurationLabel(this.draftForm.durationMinutes);
    const descParts = [durationLabel];
    if (opt.supportsPlayerPricing) descParts.push(`${this.draftForm.playerCount} player(s)`);
    if (this.draftForm.resourceId) {
      const res = this.resources().find((r) => r._id === this.draftForm.resourceId);
      if (res) descParts.push(resourceSelectLabel(res));
    }

    this.sessionItems.update((items) => [
      ...items,
      {
        gamingOptionId: opt._id,
        resourceId: this.draftForm.resourceId,
        playerCount: this.draftForm.playerCount,
        durationMinutes: this.draftForm.durationMinutes,
        name: opt.name,
        description: descParts.join(' · '),
        suggestedPrice: pricing.price,
      },
    ]);

    this.applyDefaultDraftOption(this.options());
  }

  removeSession(index: number) {
    this.sessionItems.update((items) => items.filter((_, i) => i !== index));
  }

  formatDurationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
  }

  onSubmit() {
    const customer = this.customerDetails();
    if (
      !validateRequiredFields(
        [
          { id: 'booking-customer-name', label: 'Customer', valid: () => !!customer?.name.trim() },
          { id: 'booking-customer-phone', label: 'Phone', valid: () => !!customer?.phone.trim() },
          { id: 'booking-scheduled-start', label: 'Date & Time', valid: () => !!this.form.scheduledStart },
        ],
        this.snackbar
      )
    ) {
      return;
    }

    if (this.isEdit()) {
      if (
        !validateRequiredFields(
          [{ id: 'booking-gaming-option', label: 'Gaming Option', valid: () => !!this.form.gamingOptionId }],
          this.snackbar
        )
      ) {
        return;
      }
      this.submitEdit(customer!);
      return;
    }

    if (!this.sessionItems().length) {
      this.snackbar.warning('Add at least one session');
      return;
    }

    this.submitCreate(customer!);
  }

  private submitEdit(customer: CustomerFormValue) {
    const payload = {
      ...this.form,
      customerId: customer.customerId,
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
      scheduledStart: new Date(this.form.scheduledStart).toISOString(),
      resourceId: this.form.resourceId || null,
      notes: this.form.notes.trim() || undefined,
    };

    this.submitting.set(true);
    this.bookingService.update(this.bookingId()!, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackbar.success('Booking updated');
        this.router.navigate(['/admin/bookings']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackbar.error(err.error?.error || 'Failed to save booking');
      },
    });
  }

  private submitCreate(customer: CustomerFormValue) {
    const items = this.sessionItems();
    this.submitting.set(true);

    const createNext = (index: number) => {
      if (index >= items.length) {
        this.submitting.set(false);
        this.snackbar.success(items.length > 1 ? `${items.length} bookings created` : 'Booking created');
        this.router.navigate(['/admin/bookings']);
        return;
      }

      const item = items[index];
      this.bookingService
        .create({
          customerId: customer.customerId,
          customerName: customer.name.trim(),
          customerPhone: customer.phone.trim(),
          scheduledStart: new Date(this.form.scheduledStart).toISOString(),
          notes: this.form.notes.trim() || undefined,
          gamingOptionId: item.gamingOptionId,
          resourceId: item.resourceId || undefined,
          playerCount: item.playerCount,
          durationMinutes: item.durationMinutes,
        })
        .subscribe({
          next: () => createNext(index + 1),
          error: (err) => {
            this.submitting.set(false);
            const msg = err.error?.error || 'Failed to create booking';
            if (index > 0) {
              this.snackbar.error(`${msg} (${index} of ${items.length} created)`);
            } else {
              this.snackbar.error(msg);
            }
          },
        });
    };

    createNext(0);
  }

  cancelBooking() {
    if (!this.bookingId()) return;
    this.submitting.set(true);
    this.bookingService.cancel(this.bookingId()!).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackbar.success('Booking cancelled');
        this.router.navigate(['/admin/bookings']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackbar.error(err.error?.error || 'Could not cancel booking');
      },
    });
  }

  markNoShow() {
    if (!this.bookingId()) return;
    this.submitting.set(true);
    this.bookingService.markNoShow(this.bookingId()!).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackbar.success('Marked as no show');
        this.router.navigate(['/admin/bookings']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackbar.error(err.error?.error || 'Could not update booking');
      },
    });
  }

  toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
