import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicService, GamingService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { GamingOption, PricingResult } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { getDurationOptions } from '../../shared/utils/duration-options';
import { gamingOptionIcon } from '../../shared/utils/session-display';
import { validateRequiredFields } from '../../shared/utils/form-validation';
import { InlineLoaderComponent } from '../../shared/transitions';

interface PublicSessionLine {
  gamingOptionId: string;
  playerCount: number;
  durationMinutes: number;
  name: string;
  description: string;
  suggestedPrice: number;
}

@Component({
  selector: 'app-public-book',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InrPipe, DurationPipe, IconComponent, InlineLoaderComponent],
  styles: [
    `
      .public-book-shell {
        @apply min-h-screen bg-bg-primary pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col;
      }

      .public-book-nav {
        @apply grid grid-cols-[1fr_auto_1fr] items-center;
      }

      .public-book-form {
        @apply flex-1 max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4 min-w-0 w-full;
      }

      .public-book-form--center {
        @apply flex flex-col items-center justify-center pt-0;
      }

      .public-book-confirm-card {
        @apply w-full;
      }

      .public-book-datetime {
        @apply min-w-0 w-full max-w-full;
      }

      .public-book-submit {
        @apply pt-2;
      }

      .pb-sessions-card {
        @apply rounded-xl border border-border bg-white/[0.03] overflow-hidden;
      }

      .pb-sessions-head {
        @apply flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border-subtle;
      }

      .pb-session-count {
        @apply text-[10px] font-semibold uppercase tracking-caption text-accent bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5 shrink-0;
      }

      .pb-cart-list {
        @apply px-3 py-2 space-y-1.5 border-b border-border-subtle bg-black/10;
      }

      .pb-cart-item {
        @apply flex items-center gap-2.5 py-2 px-2.5 rounded-lg;
      }

      .pb-cart-icon {
        @apply flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent shrink-0;
      }

      .pb-cart-body {
        @apply flex-1 min-w-0;
      }

      .pb-cart-name {
        @apply text-sm font-semibold leading-tight truncate;
      }

      .pb-cart-meta {
        @apply text-xs text-text-muted mt-0.5 truncate;
      }

      .pb-cart-price {
        @apply text-sm font-semibold text-accent tabular-nums shrink-0;
      }

      .pb-cart-remove {
        @apply flex items-center justify-center w-7 h-7 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors shrink-0;
      }

      .pb-options-wrap {
        @apply px-4 pt-3.5 pb-1;
      }

      .pb-options-label {
        @apply text-[10px] font-semibold uppercase tracking-caption text-text-muted mb-2;
      }

      .pb-options-grid {
        @apply grid grid-cols-2 gap-2;
      }

      .pb-option-pill {
        @apply flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-border bg-white/[0.03];
        @apply text-sm font-medium text-text-primary transition-all min-h-[44px] text-left;
      }

      .pb-option-pill:hover {
        @apply bg-white/[0.06] border-border-medium;
      }

      .pb-option-pill.is-selected {
        @apply border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(218,41,28,0.25)];
      }

      .pb-option-pill-icon {
        @apply flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] text-text-secondary shrink-0;
      }

      .pb-option-pill.is-selected .pb-option-pill-icon {
        @apply bg-accent/20 text-accent;
      }

      .pb-draft-panel {
        @apply mx-4 mb-4 mt-1 rounded-xl border border-border-subtle bg-white/[0.02] overflow-hidden;
      }

      .pb-draft-head {
        @apply px-3.5 py-3 border-b border-border-subtle bg-white/[0.02];
      }

      .pb-draft-title {
        @apply text-sm font-semibold;
      }

      .pb-draft-desc {
        @apply text-xs text-text-secondary mt-1 leading-relaxed;
      }

      .pb-draft-body {
        @apply p-3.5 space-y-3.5;
      }

      .pb-draft-footer {
        @apply flex items-center justify-between gap-3 pt-3.5 mt-1 border-t border-border-subtle;
      }

      .pb-draft-price {
        @apply text-xl font-bold text-accent tabular-nums leading-none;
      }
    `,
  ],
  template: `
    <div class="public-book-shell">
      <nav class="global-nav" aria-label="Global">
        <div class="global-nav-inner public-book-nav">
          <a routerLink="/" class="global-nav-link inline-flex items-center gap-1.5 justify-self-start">
            <app-icon name="arrow_back" size="sm" />
            CloudX
          </a>
          <span class="text-sm font-medium text-text-primary text-center">Book a session</span>
          <span aria-hidden="true"></span>
        </div>
      </nav>

      <div class="public-book-form" [class.public-book-form--center]="!!confirmed()">
        @if (loading()) {
          <app-inline-loader label="Loading options…" />
        } @else if (confirmed()) {
          <div class="public-book-confirm-card card text-center py-10 px-5">
            <div class="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-2xl bg-status-active/15 text-status-active">
              <app-icon name="check_circle" size="lg" />
            </div>
            <p class="font-semibold text-xl">Booking confirmed</p>
            <p class="text-text-muted text-sm mt-1">Save these references to check your booking status.</p>
            <div class="mt-5 space-y-2">
              @for (code of confirmed()!.referenceCodes; track code) {
                <p class="font-mono text-accent text-sm bg-accent/10 border border-accent/20 rounded-lg py-2 px-3">{{ code }}</p>
              }
            </div>
            <a routerLink="/" class="btn-secondary inline-flex mt-6 text-sm py-2.5 px-5 min-h-0">Back to home</a>
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" class="space-y-4 min-w-0">
            <section class="form-card space-y-4">
              <div class="form-card-header">
                <div class="form-card-icon form-card-icon-accent">
                  <app-icon name="person" size="sm" />
                </div>
                <div class="form-card-copy">
                  <p class="form-card-title">Your details</p>
                  <p class="form-card-hint">Name and phone for the booking</p>
                </div>
              </div>
              <div>
                <label class="label" for="book-name">Your name</label>
                <input id="book-name" class="input" [(ngModel)]="form.customerName" name="name" placeholder="Full name" autocomplete="name" />
              </div>
              <div>
                <label class="label" for="book-phone">Phone number</label>
                <input id="book-phone" class="input" [(ngModel)]="form.customerPhone" name="phone" placeholder="10-digit mobile" autocomplete="tel" />
              </div>
            </section>

            <section class="form-card space-y-4">
              <div class="form-card-header">
                <div class="form-card-icon form-card-icon-accent">
                  <app-icon name="calendar_today" size="sm" />
                </div>
                <div class="form-card-copy">
                  <p class="form-card-title">Schedule</p>
                  <p class="form-card-hint">When you'd like to play</p>
                </div>
              </div>
              <div>
                <label class="label" for="book-datetime">Date & time</label>
                <div class="select-wrap has-leading-icon">
                  <span class="select-icon">
                    <app-icon name="calendar_today" size="sm" />
                  </span>
                  <input id="book-datetime" type="datetime-local" class="input public-book-datetime" [(ngModel)]="form.scheduledStart" name="start" />
                </div>
              </div>
            </section>

            <section class="pb-sessions-card">
              <div class="pb-sessions-head">
                <div class="form-card-header min-w-0">
                  <div class="form-card-icon form-card-icon-accent">
                    <app-icon name="sports_esports" size="sm" />
                  </div>
                  <div class="form-card-copy">
                    <p class="form-card-title">Sessions</p>
                    <p class="form-card-hint">Add what you want to play</p>
                  </div>
                </div>
                @if (sessionItems().length) {
                  <span class="pb-session-count">{{ sessionItems().length }} added</span>
                }
              </div>

              @if (sessionItems().length) {
                <div class="pb-cart-list">
                  @for (item of sessionItems(); track $index; let i = $index) {
                    <div class="pb-cart-item">
                      <div class="pb-cart-icon">
                        <app-icon [name]="optionIcon(item.name)" size="sm" />
                      </div>
                      <div class="pb-cart-body">
                        <p class="pb-cart-name">{{ item.name }}</p>
                        <p class="pb-cart-meta">{{ item.description }}</p>
                      </div>
                      <p class="pb-cart-price">{{ item.suggestedPrice | inr }}</p>
                      <button type="button" class="pb-cart-remove" (click)="removeSession(i)" aria-label="Remove session">
                        <app-icon name="close" size="sm" />
                      </button>
                    </div>
                  }
                </div>
              }

              <div class="pb-options-wrap">
                <p class="pb-options-label">Gaming option</p>
                <div class="pb-options-grid" role="listbox" aria-label="Gaming options">
                  @for (opt of options(); track opt._id) {
                    <button
                      type="button"
                      role="option"
                      [attr.aria-selected]="draftForm.gamingOptionId === opt._id"
                      (click)="selectDraftOption(opt._id)"
                      class="pb-option-pill"
                      [class.is-selected]="draftForm.gamingOptionId === opt._id"
                    >
                      <span class="pb-option-pill-icon">
                        <app-icon [name]="optionIcon(opt.name)" size="sm" />
                      </span>
                      <span class="truncate">{{ opt.name }}</span>
                    </button>
                  }
                </div>
              </div>

              @if (draftForm.gamingOptionId && draftSelectedOption(); as selected) {
                <div class="pb-draft-panel">
                  <div class="pb-draft-head">
                    <p class="pb-draft-title">{{ selected.name }}</p>
                    @if (selected.description) {
                      <p class="pb-draft-desc">{{ selected.description }}</p>
                    }
                  </div>
                  <div class="pb-draft-body">
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

                    @if (selected.supportsPlayerPricing) {
                      <div>
                        <label class="label">Players</label>
                        <div class="choice-row">
                          @for (p of draftPlayerOptions(); track p) {
                            <button type="button" (click)="draftForm.playerCount = p; recalculateDraftPrice()" [class]="chipClass(draftForm.playerCount === p)">
                              {{ p }}P
                            </button>
                          }
                        </div>
                      </div>
                    }

                    @if (draftPricing()) {
                      <div class="pb-draft-footer">
                        <div>
                          <p class="text-[10px] font-semibold uppercase tracking-caption text-text-muted">Price</p>
                          <p class="pb-draft-price">{{ draftPricing()!.price | inr }}</p>
                        </div>
                        <button type="button" class="btn-primary text-sm py-2.5 px-5 min-h-0 shrink-0" (click)="addSession()">
                          <app-icon name="add" size="sm" />
                          Add session
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </section>

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

            <div class="public-book-submit">
              <button type="submit" class="btn-primary w-full" [disabled]="submitting() || !sessionItems().length">
                <app-icon name="event_available" size="sm" />
                {{ submitting() ? 'Booking…' : sessionItems().length > 1 ? 'Confirm ' + sessionItems().length + ' Bookings' : 'Confirm Booking' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class PublicBookComponent implements OnInit {
  private publicService = inject(PublicService);
  private gamingService = inject(GamingService);
  private snackbar = inject(SnackbarService);

  options = signal<GamingOption[]>([]);
  draftPricing = signal<PricingResult | null>(null);
  sessionItems = signal<PublicSessionLine[]>([]);
  confirmed = signal<{ referenceCodes: string[] } | null>(null);
  submitting = signal(false);
  loading = signal(true);

  form = {
    customerName: '',
    customerPhone: '',
    scheduledStart: '',
  };

  draftForm = {
    gamingOptionId: '',
    durationMinutes: 60,
    playerCount: 1,
  };

  totalEstimate = computed(() => this.sessionItems().reduce((sum, item) => sum + item.suggestedPrice, 0));
  optionIcon = gamingOptionIcon;

  ngOnInit() {
    this.publicService.getOptions().subscribe({
      next: (o) => {
        this.options.set(o);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.error('Could not load gaming options');
      },
    });
  }

  draftSelectedOption = () => this.options().find((o) => o._id === this.draftForm.gamingOptionId);
  draftDurationOptions = () => getDurationOptions(this.draftSelectedOption(), 'booking');

  draftPlayerOptions = () => {
    const opt = this.draftSelectedOption();
    if (!opt) return [1];
    return Array.from({ length: opt.maxPlayers - opt.minPlayers + 1 }, (_, i) => opt.minPlayers + i);
  };

  chipClass(selected: boolean): string {
    return selected ? 'choice-chip choice-chip-active' : 'choice-chip';
  }

  selectDraftOption(optionId: string) {
    if (this.draftForm.gamingOptionId === optionId) return;
    this.draftForm.gamingOptionId = optionId;
    this.onDraftOptionChange();
  }

  onDraftOptionChange() {
    const opt = this.draftSelectedOption();
    this.draftForm.playerCount = opt?.minPlayers || 1;
    this.draftForm.durationMinutes = opt?.minDurationMinutes || 60;
    this.recalculateDraftPrice();
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

    this.sessionItems.update((items) => [
      ...items,
      {
        gamingOptionId: opt._id,
        playerCount: this.draftForm.playerCount,
        durationMinutes: this.draftForm.durationMinutes,
        name: opt.name,
        description: descParts.join(' · '),
        suggestedPrice: pricing.price,
      },
    ]);
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
    if (
      !validateRequiredFields(
        [
          { id: 'book-name', label: 'Your Name', valid: () => !!this.form.customerName.trim() },
          { id: 'book-phone', label: 'Phone Number', valid: () => !!this.form.customerPhone.trim() },
          { id: 'book-datetime', label: 'Date & Time', valid: () => !!this.form.scheduledStart },
        ],
        this.snackbar
      )
    ) {
      return;
    }

    if (!this.sessionItems().length) {
      this.snackbar.warning('Add at least one session');
      return;
    }

    const items = this.sessionItems();
    this.submitting.set(true);
    const referenceCodes: string[] = [];

    const createNext = (index: number) => {
      if (index >= items.length) {
        this.submitting.set(false);
        this.confirmed.set({ referenceCodes });
        return;
      }

      const item = items[index];
      this.publicService
        .createBooking({
          customerName: this.form.customerName.trim(),
          customerPhone: this.form.customerPhone.trim(),
          scheduledStart: new Date(this.form.scheduledStart).toISOString(),
          gamingOptionId: item.gamingOptionId,
          playerCount: item.playerCount,
          durationMinutes: item.durationMinutes,
        })
        .subscribe({
          next: (res) => {
            if (res.referenceCode) referenceCodes.push(res.referenceCode);
            createNext(index + 1);
          },
          error: (err) => {
            this.submitting.set(false);
            const msg = err.error?.error || 'Could not complete booking';
            if (index > 0) {
              this.snackbar.error(`${msg} (${index} of ${items.length} booked)`);
              this.confirmed.set({ referenceCodes });
            } else {
              this.snackbar.error(msg);
            }
          },
        });
    };

    createNext(0);
  }
}
