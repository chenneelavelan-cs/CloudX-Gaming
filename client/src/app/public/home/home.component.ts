import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicService } from '../../core/services/domain.service';
import { PublicCartService } from '../../core/services/public-cart.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { GamingOption, Product } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { MediaImageComponent } from '../../shared/components/media-image.component';
import { TextsRevealDirective } from '../../shared/transitions/texts-reveal.directive';
import { gamingOptionIcon } from '../../shared/utils/session-display';
import {
  gamingImagePath,
  productImagePath,
  slugify,
} from '../../shared/utils/media-paths';
import { collectGroups, groupLabel } from '../../shared/utils/product-groups';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    InrPipe,
    IconComponent,
    MediaImageComponent,
    TextsRevealDirective,
  ],
  template: `
    <div class="public-page">
      <section class="public-hero max-w-lg mx-auto">
        <div class="public-hero-card">
          <div class="location-bar location-bar--inline mb-4">
            <app-icon name="location_on" size="sm" class="text-accent shrink-0" />
            <span class="location-bar-text">
              <span class="location-bar-label">CloudX Gaming</span>
              <span class="location-bar-address">Sholinganallur, Chennai</span>
            </span>
          </div>

          <div class="t-stagger" tTextsReveal>
            <p class="public-hero-kicker t-stagger-line">Premium gaming</p>
            <h1 class="public-hero-title t-stagger-line">
              Play your way at <span class="text-accent">CloudX</span>
            </h1>
            <p class="public-hero-lead t-stagger-line t-stagger-line--2">
              Book PS5, PC, VR and more — snacks ready when you arrive.
            </p>
            <div class="public-cta-stack t-stagger-line t-stagger-line--2">
              <a routerLink="/book" class="btn-primary">
                <app-icon name="event_available" size="sm" />
                Book a session
              </a>
              <a routerLink="/" fragment="menu" class="btn-secondary">
                <app-icon name="restaurant" size="sm" />
                Browse menu
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Gaming options -->
      <section class="public-section max-w-lg mx-auto">
        <div class="public-section-head">
          <h2 class="public-section-title">Gaming stations</h2>
          <p class="public-section-sub">Pick a setup — book in under a minute</p>
        </div>

        @if (loading()) {
          <div class="catalog-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="catalog-card catalog-card--skeleton"></div>
            }
          </div>
        } @else {
          <div class="category-chips mb-4" role="tablist" aria-label="Filter gaming options">
            <button
              type="button"
              role="tab"
              class="category-chip"
              [class.category-chip--active]="!gamingFilter()"
              [attr.aria-selected]="!gamingFilter()"
              (click)="gamingFilter.set('')"
            >
              All
            </button>
            @for (opt of options(); track opt._id) {
              <button
                type="button"
                role="tab"
                class="category-chip"
                [class.category-chip--active]="gamingFilter() === opt._id"
                [attr.aria-selected]="gamingFilter() === opt._id"
                (click)="gamingFilter.set(opt._id)"
              >
                {{ opt.name }}
              </button>
            }
          </div>

          <div class="catalog-grid">
            @for (opt of filteredOptions(); track opt._id) {
              <a
                [routerLink]="['/book']"
                [queryParams]="{ option: opt.slug }"
                class="catalog-card catalog-card--gaming no-underline text-inherit"
              >
                <div class="catalog-card-media">
                  <app-media-image
                    [src]="gamingImage(opt)"
                    [alt]="opt.name"
                    aspect="wide"
                    [fallbackIcon]="optionIcon(opt.name)"
                    fallbackClass="media-image-fallback--gaming"
                  />
                </div>
                <div class="catalog-card-body">
                  <p class="catalog-card-title">{{ opt.name }}</p>
                  @if (opt.description) {
                    <p class="catalog-card-desc">{{ opt.description }}</p>
                  }
                  <p class="catalog-card-cta">
                    Book now
                    <app-icon name="arrow_forward" size="sm" />
                  </p>
                </div>
              </a>
            }
          </div>
        }
      </section>

      <!-- Menu -->
      <section id="menu" class="public-section max-w-lg mx-auto border-t border-border-subtle">
        <div class="public-section-head">
          <h2 class="public-section-title">Snacks &amp; drinks</h2>
          <p class="public-section-sub">Add to your cart — we'll have it ready</p>
        </div>

        @if (loading()) {
          <div class="menu-list space-y-3">
            @for (i of [1, 2, 3]; track i) {
              <div class="menu-card menu-card--skeleton"></div>
            }
          </div>
        } @else if (!products().length) {
          <div class="card text-center py-10 text-text-muted text-sm">Menu coming soon</div>
        } @else {
          @for (group of productGroups(); track group) {
            <h3 class="menu-group-label">{{ groupLabel(group) }}</h3>
            <div class="menu-list mb-6 last:mb-0">
              @for (p of getByGroup(group); track p._id) {
                <div class="menu-card">
                  <div class="menu-card-media">
                    <app-media-image
                      [src]="productImage(p)"
                      [alt]="p.name"
                      aspect="square"
                      fallbackIcon="local_cafe"
                      fallbackClass="media-image-fallback--product"
                      fallbackIconSize="md"
                    />
                  </div>
                  <div class="menu-card-body min-w-0">
                    <p class="menu-card-title">
                      @if (p.mustTry) {
                        <span class="menu-badge">Must try</span>
                      }
                      {{ p.name }}
                    </p>
                    @if (p.description) {
                      <p class="menu-card-desc">{{ p.description }}</p>
                    }
                    <p class="menu-card-price">{{ p.price | inr }}</p>
                  </div>
                  <div class="menu-card-action">
                    @if (snackQty(p._id); as qty) {
                      <div class="qty-stepper">
                        <button type="button" class="qty-stepper-btn" (click)="decrementSnack(p)" aria-label="Remove one">
                          <app-icon name="remove" size="sm" />
                        </button>
                        <span class="qty-stepper-value">{{ qty }}</span>
                        <button type="button" class="qty-stepper-btn" (click)="incrementSnack(p)" aria-label="Add one">
                          <app-icon name="add" size="sm" />
                        </button>
                      </div>
                    } @else {
                      <button type="button" class="menu-add-btn" (click)="incrementSnack(p)">
                        ADD
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </section>

      <!-- CTA band -->
      <section class="public-section max-w-lg mx-auto text-center">
        <h2 class="display-lg">Ready to play?</h2>
        <p class="lead-copy mt-2">Book your session in seconds — walk in and game.</p>
        <a routerLink="/book" class="btn-primary inline-flex mt-6 w-full sm:w-auto normal-case tracking-normal !text-sm">
          <app-icon name="event_available" size="sm" />
          Reserve a station
        </a>
      </section>

      <footer class="app-footer public-footer">
        <p>CloudX Gaming · Sholinganallur, Chennai</p>
        <p class="text-xs mt-1 opacity-70">Open daily · Walk-ins welcome</p>
        <a routerLink="/admin/login" class="app-footer-link inline-flex items-center gap-1 justify-center mt-3">
          Staff login
        </a>
      </footer>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private publicService = inject(PublicService);
  private cart = inject(PublicCartService);
  private snackbar = inject(SnackbarService);

  options = signal<GamingOption[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);
  gamingFilter = signal('');

  optionIcon = gamingOptionIcon;
  groupLabel = groupLabel;

  productGroups = computed(() => collectGroups(this.products()));
  filteredOptions = computed(() => {
    const filter = this.gamingFilter();
    const opts = this.options();
    if (!filter) return opts;
    return opts.filter((o) => o._id === filter);
  });

  ngOnInit() {
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending <= 0) this.loading.set(false);
    };

    this.publicService.getOptions().subscribe({
      next: (o) => {
        this.options.set(o);
        done();
      },
      error: () => {
        done();
        this.snackbar.error('Could not load gaming options');
      },
    });

    this.publicService.getProducts().subscribe({
      next: (p) => {
        this.products.set(p);
        done();
      },
      error: () => done(),
    });
  }

  gamingImage(opt: GamingOption): string {
    return gamingImagePath(opt.slug || slugify(opt.name));
  }

  productImage(p: Product): string {
    return productImagePath(slugify(p.name));
  }

  getByGroup(group: string): Product[] {
    return this.products().filter((p) => (p.category || 'other') === group);
  }

  snackQty(productId: string): number | null {
    const item = this.cart.snackItems().find((i) => i.productId === productId);
    return item?.quantity ?? null;
  }

  incrementSnack(p: Product) {
    this.cart.addSnack(p._id, p.name, p.price);
    this.snackbar.success(`${p.name} added`);
  }

  decrementSnack(p: Product) {
    const qty = this.snackQty(p._id);
    if (qty == null) return;
    this.cart.setSnackQuantity(p._id, qty - 1);
  }
}
