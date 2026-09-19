import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PublicService, GamingService } from '../../core/services/domain.service';
import { PublicCartService } from '../../core/services/public-cart.service';
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
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InrPipe,
    DurationPipe,
    IconComponent,
    InlineLoaderComponent,
  ],
  template: `
    <div class="public-book-page" [class.public-book-page--center]="!!confirmed()">
      @if (loading()) {
        <app-inline-loader label="Loading options…" />
      } @else if (confirmed()) {
        <div class="card text-center py-10 px-5 w-full max-w-md">
          <div class="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-status-active/15 text-status-active">
            <app-icon name="check_circle" size="xl" />
          </div>
          <p class="font-semibold text-xl">You're booked!</p>
          <p class="text-text-muted text-sm mt-1">Save these references — show them when you arrive.</p>
          <div class="mt-5 space-y-2">
            @for (code of confirmed()!.referenceCodes; track code) {
              <p class="font-mono text-accent text-sm bg-accent/10 border border-accent/20 rounded-lg py-2.5 px-3">{{ code }}</p>
            }
          </div>
          @if (cart.snackItems().length) {
            <p class="text-text-secondary text-sm mt-4">
              Snacks pre-ordered: {{ cart.snackItems().length }} item{{ cart.snackItems().length === 1 ? '' : 's' }}
            </p>
          }
          <a routerLink="/" class="btn-primary inline-flex mt-6 text-sm py-2.5 px-5 min-h-0 normal-case tracking-normal">Back to home</a>
        </div>
      } @else {
        <header class="public-book-header">
          <h1 class="public-book-title">Book a session</h1>
          <p class="public-book-sub">Pick a station, add snacks if you like, then confirm.</p>
        </header>

        <form id="public-book-form" (ngSubmit)="onSubmit()" class="space-y-4 min-w-0">
          <section class="pb-sessions-card">
            <div class="pb-sessions-head">
              <div class="form-card-header min-w-0">
                <div class="form-card-icon form-card-icon-accent">
                  <app-icon name="sports_esports" size="sm" />
                </div>
                <div class="form-card-copy">
                  <p class="form-card-title">Gaming sessions</p>
                  <p class="form-card-hint">What you want to play</p>
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
              <p class="pb-options-label">Choose a station</p>
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
                    <span class="pb-option-pill-label">{{ opt.name }}</span>
                  </button>
                }
              </div>
            </div>

            @if (!sessionItems().length && !draftForm.gamingOptionId) {
              <p class="pb-empty-hint">Tap a station above to configure your session</p>
            }

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
                        <p class="text-xs text-text-muted">Price</p>
                        <p class="pb-draft-price">{{ draftPricing()!.price | inr }}</p>
                      </div>
                      <button type="button" class="btn-primary text-sm py-2.5 px-5 min-h-0 shrink-0 normal-case tracking-normal" (click)="addSession()">
                        <app-icon name="add" size="sm" />
                        Add session
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </section>

          @if (cart.snackItems().length) {
            <section class="form-card">
              <div class="form-card-header">
                <div class="form-card-icon form-card-icon-accent">
                  <app-icon name="restaurant" size="sm" />
                </div>
                <div class="form-card-copy">
                  <p class="form-card-title">Snacks pre-order</p>
                  <p class="form-card-hint">We'll have these ready when you arrive</p>
                </div>
              </div>
              @for (item of cart.snackItems(); track item.productId) {
                <div class="pb-snack-row">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ item.name }}</p>
                    <p class="text-xs text-text-muted">{{ item.price | inr }} each</p>
                  </div>
                  <div class="qty-stepper">
                    <button type="button" class="qty-stepper-btn" (click)="cart.setSnackQuantity(item.productId, item.quantity - 1)" aria-label="Remove one">
                      <app-icon name="remove" size="sm" />
                    </button>
                    <span class="qty-stepper-value">{{ item.quantity }}</span>
                    <button type="button" class="qty-stepper-btn" (click)="cart.setSnackQuantity(item.productId, item.quantity + 1)" aria-label="Add one">
                      <app-icon name="add" size="sm" />
                    </button>
                  </div>
                  <p class="text-sm font-semibold text-accent tabular-nums shrink-0 w-16 text-right">
                    {{ item.price * item.quantity | inr }}
                  </p>
                </div>
              }
              <a routerLink="/" fragment="menu" class="text-sm text-accent inline-flex items-center gap-1 mt-2 no-underline hover:underline">
                <app-icon name="add" size="sm" />
                Add more from menu
              </a>
            </section>
          } @else {
            <a routerLink="/" fragment="menu" class="menu-upsell-card no-underline">
              <app-icon name="restaurant" size="sm" class="text-accent shrink-0" />
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-medium text-text-primary">Add snacks?</span>
                <span class="block text-xs text-text-muted">Browse menu and pre-order for your session</span>
              </span>
              <app-icon name="chevron_right" size="sm" class="text-text-muted shrink-0" />
            </a>
          }

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
              <label class="label" for="book-datetime">Date &amp; time</label>
              <div class="select-wrap has-leading-icon">
                <span class="select-icon">
                  <app-icon name="calendar_today" size="sm" />
                </span>
                <input id="book-datetime" type="datetime-local" class="input min-w-0 w-full max-w-full" [(ngModel)]="form.scheduledStart" name="start" />
              </div>
            </div>
          </section>

          @if (sessionItems().length) {
            <div class="price-card">
              <div class="price-card-main">
                <div class="price-card-header">
                  <app-icon name="payments" size="sm" class="text-accent/70" />
                  <span class="price-card-label">Estimate</span>
                </div>
                <p class="price-card-amount">{{ grandTotal() | inr }}</p>
                <p class="text-xs text-text-muted mt-2">
                  {{ sessionItems().length }} session{{ sessionItems().length === 1 ? '' : 's' }}
                  @if (cart.snackItems().length) {
                    · {{ cart.snackCount() }} snack{{ cart.snackCount() === 1 ? '' : 's' }}
                  }
                  · Pay at venue
                </p>
              </div>
            </div>
          }
        </form>

        @if (sessionItems().length) {
          <div class="sticky-checkout-bar">
            <div class="sticky-checkout-inner">
              <div class="sticky-checkout-total">
                <p class="sticky-checkout-label">Total estimate</p>
                <p class="sticky-checkout-amount">{{ grandTotal() | inr }}</p>
              </div>
              <button
                type="submit"
                form="public-book-form"
                class="sticky-checkout-btn"
                [disabled]="submitting()"
              >
                {{ submitting() ? 'Booking…' : 'Confirm' }}
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class PublicBookComponent implements OnInit {
  private publicService = inject(PublicService);
  private gamingService = inject(GamingService);
  private snackbar = inject(SnackbarService);
  private route = inject(ActivatedRoute);
  cart = inject(PublicCartService);

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
  grandTotal = computed(() => this.totalEstimate() + this.cart.snackTotal());
  optionIcon = gamingOptionIcon;

  ngOnInit() {
    this.publicService.getOptions().subscribe({
      next: (o) => {
        this.options.set(o);
        this.loading.set(false);
        this.applyOptionQueryParam(o);
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.error('Could not load gaming options');
      },
    });
  }

  private applyOptionQueryParam(options: GamingOption[]) {
    const slug = this.route.snapshot.queryParamMap.get('option');
    if (!slug) return;
    const match = options.find((o) => o.slug === slug || o._id === slug);
    if (match) {
      this.selectDraftOption(match._id);
    }
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
    this.snackbar.success(`${opt.name} added to booking`);
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
        this.snackbar,
      )
    ) {
      return;
    }

    if (!this.sessionItems().length) {
      this.snackbar.warning('Add at least one session');
      return;
    }

    const items = this.sessionItems();
    const snackNotes = this.cart.notesLine();
    this.submitting.set(true);
    const referenceCodes: string[] = [];

    const createNext = (index: number) => {
      if (index >= items.length) {
        this.submitting.set(false);
        this.cart.clearSnacks();
        this.confirmed.set({ referenceCodes });
        return;
      }

      const item = items[index];
      const notes = index === 0 && snackNotes ? snackNotes : undefined;

      this.publicService
        .createBooking({
          customerName: this.form.customerName.trim(),
          customerPhone: this.form.customerPhone.trim(),
          scheduledStart: new Date(this.form.scheduledStart).toISOString(),
          gamingOptionId: item.gamingOptionId,
          playerCount: item.playerCount,
          durationMinutes: item.durationMinutes,
          notes,
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
              this.cart.clearSnacks();
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
