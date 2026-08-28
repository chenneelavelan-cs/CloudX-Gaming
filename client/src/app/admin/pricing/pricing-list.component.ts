import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PricingService, GamingService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PricingTier } from '../../shared/models';
import { DurationPipe, InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';

type PopulatedOption = {
  _id: string;
  name: string;
  slug?: string;
  supportsPlayerPricing?: boolean;
  membershipDiscountPercent?: number;
};

export type PopulatedPricingTier = Omit<PricingTier, 'gamingOptionId'> & {
  gamingOptionId: PopulatedOption | string;
};

interface PricingGroup {
  optionId: string;
  optionName: string;
  supportsPlayerPricing: boolean;
  membershipDiscountPercent: number;
  isPc: boolean;
  tiers: PopulatedPricingTier[];
}

const PC_DEFAULT_DISCOUNT = 10;

@Component({
  selector: 'app-pricing-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DurationPipe, InrPipe, IconComponent],
  styles: [
    `
      .no-spin {
        -moz-appearance: textfield;
      }
      .no-spin::-webkit-outer-spin-button,
      .no-spin::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .pricing-card {
        transition:
          border-color 400ms ease,
          box-shadow 500ms cubic-bezier(0.32, 0.72, 0, 1),
          background 400ms ease;
      }

      .accordion-body {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 550ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .accordion-body.expanded {
        grid-template-rows: 1fr;
      }
      .accordion-inner {
        overflow: hidden;
        min-height: 0;
      }
      .accordion-content {
        opacity: 0;
        transform: translateY(-6px);
        transition:
          opacity 280ms ease,
          transform 550ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .accordion-body.expanded .accordion-content {
        opacity: 1;
        transform: translateY(0);
        transition:
          opacity 420ms ease 120ms,
          transform 550ms cubic-bezier(0.32, 0.72, 0, 1) 80ms;
      }

      .accordion-chevron {
        transition: transform 550ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .accordion-chevron.expanded {
        transform: rotate(180deg);
      }

      .price-badge {
        transition:
          opacity 350ms ease,
          transform 350ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .price-badge.hidden-badge {
        opacity: 0;
        transform: scale(0.92);
        pointer-events: none;
      }
    `,
  ],
  template: `
    <div class="max-w-2xl mx-auto">
      <header class="mb-5">
        <h1 class="page-heading mb-1">Pricing</h1>
        <p class="text-sm text-text-muted">Tap a category to expand and edit prices</p>
      </header>

      @if (loading()) {
        <div class="space-y-2.5">
          @for (i of [1, 2, 3]; track i) {
            <div class="rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden animate-pulse">
              <div class="h-[3.75rem] bg-white/[0.04]"></div>
            </div>
          }
        </div>
      } @else if (groups().length === 0) {
        <div class="rounded-2xl border border-border bg-white/[0.03] text-center py-14 px-6">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 text-accent/60 mb-4">
            <app-icon name="payments" size="lg" />
          </div>
          <p class="text-text-secondary font-medium">No pricing tiers configured</p>
          <p class="text-text-muted text-sm mt-1">Add gaming options in settings to get started</p>
        </div>
      } @else {
        <div class="space-y-2.5 pb-6">
          @for (group of groups(); track group.optionId) {
            <section
              class="pricing-card rounded-xl border overflow-hidden"
              [class]="groupCardClass(group)"
            >
              <button
                type="button"
                class="relative w-full text-left px-4 py-3.5 transition-colors duration-300 hover:bg-white/[0.04] active:bg-white/[0.06]"
                (click)="toggleGroup(group.optionId)"
                [attr.aria-expanded]="isExpanded(group.optionId)"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ring-1"
                    [class]="groupIconClass(group)"
                  >
                    <app-icon [name]="getOptionIcon(group.optionName)" size="sm" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-[15px] truncate leading-tight">{{ group.optionName }}</p>
                    <p class="text-[11px] text-text-muted mt-0.5 truncate">
                      @if (group.supportsPlayerPricing) {
                        Per player / hour
                      } @else {
                        Flat rate
                      }
                      <span class="text-text-muted/60 mx-1">·</span>
                      {{ group.tiers.length }} tier{{ group.tiers.length === 1 ? '' : 's' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span
                      class="price-badge text-xs font-semibold text-accent tabular-nums px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/15"
                      [class.hidden-badge]="isExpanded(group.optionId)"
                    >
                      {{ groupPriceSummary(group) }}
                    </span>
                    <span
                      class="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] text-text-muted"
                    >
                      <app-icon
                        name="expand_more"
                        size="sm"
                        class="accordion-chevron"
                        [class.expanded]="isExpanded(group.optionId)"
                      />
                    </span>
                  </div>
                </div>
              </button>

              <div class="accordion-body" [class.expanded]="isExpanded(group.optionId)">
                <div class="accordion-inner">
                  <div class="accordion-content border-t border-white/[0.06] bg-black/10">
                    <div
                      class="mx-3 mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-3.5 py-3 flex items-center gap-3"
                      [class.opacity-50]="savingDiscountId() === group.optionId"
                      [class.pointer-events-none]="savingDiscountId() === group.optionId"
                    >
                      <app-icon name="card_membership" size="sm" class="text-emerald-400 shrink-0" />
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-medium text-text-primary">Membership discount</p>
                        <p class="text-[10px] text-text-muted mt-0.5">For member pricing on all tiers</p>
                      </div>
                      <div class="relative shrink-0">
                        <input
                          type="number"
                          class="no-spin w-[4.5rem] h-9 pl-2 pr-6 text-center text-sm font-bold text-emerald-400 tabular-nums bg-black/25 border border-emerald-500/25 rounded-lg focus:outline-none focus:border-emerald-400/45 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                          min="0"
                          max="100"
                          step="1"
                          [ngModel]="draftDiscounts()[group.optionId] ?? group.membershipDiscountPercent"
                          (ngModelChange)="onDiscountDraftChange(group.optionId, $event)"
                          (blur)="commitDiscountDraft(group)"
                          (keydown.enter)="commitDiscountDraft(group); $event.preventDefault()"
                          [disabled]="savingDiscountId() === group.optionId"
                          (click)="$event.stopPropagation()"
                        />
                        <span class="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400/70 text-xs font-semibold pointer-events-none">%</span>
                      </div>
                    </div>

                    <ul class="divide-y divide-white/[0.06] px-1 py-1">
                      @for (tier of group.tiers; track tier._id) {
                        <li
                          class="flex items-center gap-3 px-3 py-3 transition-opacity"
                          [class.opacity-50]="savingId() === tier._id"
                          [class.pointer-events-none]="savingId() === tier._id"
                        >
                          <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-text-primary leading-none">
                              {{ tier.durationMinutes | duration }}
                              @if (tier.playerCount) {
                                <span class="text-text-muted font-normal"> · {{ tier.playerCount }}P</span>
                              } @else if (tier.label) {
                                <span class="text-text-muted font-normal"> · {{ tier.label }}</span>
                              }
                            </p>
                            @if (group.membershipDiscountPercent > 0) {
                              <p class="text-[10px] text-emerald-400/75 mt-1 tabular-nums">
                                Member {{ memberPrice(tier.price, group.membershipDiscountPercent) | inr }}
                              </p>
                            }
                          </div>
                          <div class="relative shrink-0 w-[6.5rem]">
                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-accent/70 text-xs font-semibold pointer-events-none select-none">₹</span>
                            <input
                              type="number"
                              class="no-spin w-full h-9 pl-6 pr-2 text-right text-sm font-bold text-accent tabular-nums bg-white/[0.05] border border-white/[0.1] rounded-lg focus:outline-none focus:border-accent/35 focus:ring-1 focus:ring-accent/15 transition-colors"
                              min="0"
                              step="1"
                              [ngModel]="draftPrices()[tier._id] ?? tier.price"
                              (ngModelChange)="onDraftChange(tier._id, $event)"
                              (blur)="commitDraft(tier)"
                              (keydown.enter)="commitDraft(tier); $event.preventDefault()"
                              [disabled]="savingId() === tier._id"
                              (click)="$event.stopPropagation()"
                            />
                          </div>
                        </li>
                      }
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class PricingListComponent implements OnInit {
  private pricingService = inject(PricingService);
  private gamingService = inject(GamingService);
  private snackbar = inject(SnackbarService);

  tiers = signal<PopulatedPricingTier[]>([]);
  loading = signal(true);
  savingId = signal<string | null>(null);
  savingDiscountId = signal<string | null>(null);
  draftPrices = signal<Record<string, number>>({});
  draftDiscounts = signal<Record<string, number>>({});
  expandedGroups = signal<Set<string>>(new Set());

  groups = computed((): PricingGroup[] => {
    const map = new Map<string, PricingGroup>();

    for (const tier of this.tiers()) {
      const opt = tier.gamingOptionId;
      const optionId = typeof opt === 'object' ? opt._id : String(opt);
      const optionName = typeof opt === 'object' ? opt.name : 'Unknown';
      const supportsPlayerPricing = typeof opt === 'object' ? !!opt.supportsPlayerPricing : false;
      const isPc = this.isPcOption(optionName);
      const rawDiscount = typeof opt === 'object' ? (opt.membershipDiscountPercent ?? 0) : 0;
      const membershipDiscountPercent = isPc && rawDiscount === 0 ? PC_DEFAULT_DISCOUNT : rawDiscount;

      if (!map.has(optionId)) {
        map.set(optionId, {
          optionId,
          optionName,
          supportsPlayerPricing,
          membershipDiscountPercent,
          isPc,
          tiers: [],
        });
      }
      map.get(optionId)!.tiers.push(tier);
    }

    return Array.from(map.values());
  });

  ngOnInit() {
    this.pricingService.getTiers().subscribe({
      next: (t) => {
        this.tiers.set(t as PopulatedPricingTier[]);
        this.loading.set(false);
        this.ensurePcDefaults();
      },
      error: () => {
        this.loading.set(false);
        this.snackbar.error('Failed to load pricing');
      },
    });
  }

  groupCardClass(group: PricingGroup): string {
    const expanded = this.isExpanded(group.optionId);
    const base = expanded
      ? 'border-white/[0.14] bg-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.28)]'
      : 'border-white/[0.08] bg-white/[0.025] shadow-none';

    if (group.isPc) {
      return `${base} ${expanded ? 'ring-1 ring-violet-500/20' : ''}`;
    }
    if (group.supportsPlayerPricing) {
      return `${base} ${expanded ? 'ring-1 ring-status-info/20' : ''}`;
    }
    return `${base} ${expanded ? 'ring-1 ring-accent/15' : ''}`;
  }

  groupIconClass(group: PricingGroup): string {
    if (group.isPc) return 'bg-violet-500/15 text-violet-300 ring-violet-500/25';
    if (group.supportsPlayerPricing) return 'bg-status-info/15 text-status-info ring-status-info/25';
    return 'bg-accent/15 text-accent ring-accent/25';
  }

  isExpanded(optionId: string): boolean {
    return this.expandedGroups().has(optionId);
  }

  toggleGroup(optionId: string) {
    this.expandedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }

  groupPriceSummary(group: PricingGroup): string {
    const prices = group.tiers.map((t) => t.price);
    if (!prices.length) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `₹${min}`;
    return `₹${min}–₹${max}`;
  }

  private ensurePcDefaults() {
    const seen = new Set<string>();
    for (const tier of this.tiers()) {
      const opt = tier.gamingOptionId;
      if (typeof opt !== 'object' || seen.has(opt._id)) continue;
      seen.add(opt._id);
      if (!this.isPcOption(opt.name)) continue;
      if ((opt.membershipDiscountPercent ?? 0) !== 0) continue;

      this.saveDiscount(
        {
          optionId: opt._id,
          optionName: opt.name,
          supportsPlayerPricing: !!opt.supportsPlayerPricing,
          membershipDiscountPercent: 0,
          isPc: true,
          tiers: [],
        },
        PC_DEFAULT_DISCOUNT,
        true
      );
    }
  }

  isPcOption(name: string): boolean {
    return /pc|rtx/i.test(name);
  }

  getOptionIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('vr')) return 'view_in_ar';
    if (lower.includes('driving') || lower.includes('wheel')) return 'directions_car';
    if (lower.includes('pc') || lower.includes('rtx')) return 'computer';
    return 'sports_esports';
  }

  memberPrice(price: number, discountPercent: number): number {
    return Math.round(price * (1 - discountPercent / 100));
  }

  onDraftChange(tierId: string, value: number | string) {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (Number.isNaN(num)) return;
    this.draftPrices.update((d) => ({ ...d, [tierId]: Math.max(0, num) }));
  }

  commitDraft(tier: PopulatedPricingTier) {
    const draft = this.draftPrices()[tier._id];
    this.draftPrices.update((d) => {
      const next = { ...d };
      delete next[tier._id];
      return next;
    });
    if (draft == null || draft === tier.price) return;
    this.savePrice(tier, draft);
  }

  onDiscountDraftChange(optionId: string, value: number | string) {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (Number.isNaN(num)) return;
    this.draftDiscounts.update((d) => ({ ...d, [optionId]: Math.min(100, Math.max(0, num)) }));
  }

  commitDiscountDraft(group: PricingGroup) {
    const draft = this.draftDiscounts()[group.optionId];
    this.draftDiscounts.update((d) => {
      const next = { ...d };
      delete next[group.optionId];
      return next;
    });
    if (draft == null || draft === group.membershipDiscountPercent) return;
    this.saveDiscount(group, draft);
  }

  private saveDiscount(group: PricingGroup, newDiscount: number, silent = false) {
    this.savingDiscountId.set(group.optionId);
    this.gamingService.updateOption(group.optionId, { membershipDiscountPercent: newDiscount }).subscribe({
      next: () => {
        this.tiers.update((list) =>
          list.map((tier) => {
            const opt = tier.gamingOptionId;
            if (typeof opt !== 'object' || opt._id !== group.optionId) return tier;
            return {
              ...tier,
              gamingOptionId: { ...opt, membershipDiscountPercent: newDiscount },
            };
          })
        );
        this.savingDiscountId.set(null);
        if (!silent) {
          this.snackbar.success(`${group.optionName} membership discount → ${newDiscount}%`);
        }
      },
      error: () => {
        this.savingDiscountId.set(null);
        if (!silent) this.snackbar.error('Could not save membership discount');
      },
    });
  }

  private savePrice(tier: PopulatedPricingTier, newPrice: number) {
    if (newPrice < 0) return;

    this.savingId.set(tier._id);
    this.pricingService.updateTier(tier._id, { price: newPrice }).subscribe({
      next: (updated) => {
        this.tiers.update((list) =>
          list.map((t) => (t._id === updated._id ? { ...t, price: updated.price } : t))
        );
        this.savingId.set(null);
        this.snackbar.success(`${this.getTierLabel(tier)} → ₹${updated.price}`);
      },
      error: () => {
        this.savingId.set(null);
        this.snackbar.error('Could not save price');
      },
    });
  }

  private getTierLabel(tier: PopulatedPricingTier): string {
    const opt = tier.gamingOptionId;
    const name = typeof opt === 'object' ? opt.name : 'Tier';
    const players = tier.playerCount ? ` ${tier.playerCount}P` : '';
    return `${name}${players}`;
  }
}
