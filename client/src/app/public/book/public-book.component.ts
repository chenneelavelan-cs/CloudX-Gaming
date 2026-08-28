import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicService, GamingService } from '../../core/services/domain.service';
import { GamingOption, PricingResult } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { TextsRevealDirective, NumberPopInComponent, TabsSlidingDirective, TextSwapDirective } from '../../shared/transitions';

@Component({
  selector: 'app-public-book',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InrPipe, DurationPipe, IconComponent, TextsRevealDirective, NumberPopInComponent, TabsSlidingDirective, TextSwapDirective],
  template: `
    <div class="min-h-screen bg-bg-primary p-4 max-w-lg mx-auto">
      <a routerLink="/" class="text-text-secondary text-sm mb-4 inline-flex items-center gap-1 t-learn-more">
        <app-icon name="arrow_back" size="sm" />
        Back
      </a>
      <h1 class="page-heading mb-6 t-stagger" tTextsReveal>
        <span class="t-stagger-line">Book a Session</span>
      </h1>

      @if (confirmed()) {
        <div class="card text-center py-8 t-stagger is-shown">
          <div class="flex justify-center mb-4">
            <svg class="t-success-check is-open" viewBox="0 0 52 52" width="64" height="64" aria-hidden="true">
              <circle class="t-success-circle" cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="2"/>
              <path class="t-success-path" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M14 27 L22 35 L38 17"/>
            </svg>
          </div>
          <p class="font-semibold text-lg t-stagger-line">Booking Confirmed!</p>
          <p class="text-text-secondary mt-2 t-stagger-line t-stagger-line--2">Reference: <span class="text-accent font-mono">{{ confirmed()!.referenceCode }}</span></p>
          <p class="text-text-muted text-sm mt-4">Save this reference to check your booking status.</p>
        </div>
      } @else {
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="t-input-wrap">
            <label class="label">Gaming Option</label>
            <select class="input t-input" [(ngModel)]="form.gamingOptionId" name="option" (change)="recalculatePrice()" required>
              <option value="">Select</option>
              @for (opt of options(); track opt._id) {
                <option [value]="opt._id">{{ opt.name }}</option>
              }
            </select>
          </div>
          <div class="t-input-wrap">
            <label class="label">Your Name</label>
            <input id="book-name" class="input t-input" [(ngModel)]="form.customerName" name="name" required />
          </div>
          <div class="t-input-wrap">
            <label class="label">Phone Number</label>
            <input id="book-phone" class="input t-input" [(ngModel)]="form.customerPhone" name="phone" required />
          </div>
          <div class="t-input-wrap">
            <label class="label">Date & Time</label>
            <input id="book-datetime" type="datetime-local" class="input t-input" [(ngModel)]="form.scheduledStart" name="start" required />
          </div>
          <div>
            <label class="label">Duration</label>
            <div class="t-tabs" role="tablist" [tTabsActiveIndex]="durationIndex()">
              <span class="t-tabs-pill" aria-hidden="true"></span>
              @for (d of durations; track d) {
                <button type="button" class="t-tab text-sm" role="tab" [attr.aria-selected]="form.durationMinutes === d" (click)="setDuration(d)">
                  {{ d | duration }}
                </button>
              }
            </div>
          </div>
          <div class="t-input-wrap">
            <label class="label">Players</label>
            <input type="number" class="input t-input" [(ngModel)]="form.playerCount" name="players" min="1" max="4" (change)="recalculatePrice()" />
          </div>
          @if (pricing()) {
            <div class="card bg-accent/5 border-accent/20 text-center">
              <p class="text-text-secondary text-sm">Estimated Price</p>
              <p class="text-2xl font-bold text-accent"><app-number-pop-in [value]="pricing()!.price | inr" /></p>
            </div>
          }
          <button type="submit" class="btn-primary w-full" [disabled]="submitting()">
            <app-icon name="event_available" size="sm" />
            <span class="t-text-swap" [tTextSwap]="submitting() ? 'Booking...' : 'Confirm Booking'">{{ submitting() ? 'Booking...' : 'Confirm Booking' }}</span>
          </button>
        </form>
      }
    </div>
  `,
})
export class PublicBookComponent implements OnInit {
  private publicService = inject(PublicService);
  private gamingService = inject(GamingService);

  options = signal<GamingOption[]>([]);
  pricing = signal<PricingResult | null>(null);
  confirmed = signal<{ referenceCode: string } | null>(null);
  submitting = signal(false);
  durations = [60, 180, 300];

  form = {
    gamingOptionId: '',
    customerName: '',
    customerPhone: '',
    scheduledStart: '',
    durationMinutes: 60,
    playerCount: 1,
  };

  durationIndex = () => this.durations.indexOf(this.form.durationMinutes);

  ngOnInit() {
    this.publicService.getOptions().subscribe((o) => this.options.set(o));
  }

  setDuration(minutes: number) {
    this.form.durationMinutes = minutes;
    this.recalculatePrice();
  }

  recalculatePrice() {
    if (!this.form.gamingOptionId) return;
    this.gamingService
      .calculatePrice(this.form.gamingOptionId, this.form.playerCount, this.form.durationMinutes)
      .subscribe((p) => this.pricing.set(p));
  }

  onSubmit() {
    this.submitting.set(true);
    this.publicService.createBooking(this.form as unknown as Record<string, unknown>).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.confirmed.set({ referenceCode: res.referenceCode });
      },
      error: () => this.submitting.set(false),
    });
  }
}
