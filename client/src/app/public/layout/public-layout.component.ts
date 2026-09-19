import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { PublicCartService } from '../../core/services/public-cart.service';
import { IconComponent } from '../../shared/components/icon.component';
import { SnackbarComponent } from '../../shared/components/snackbar.component';
import { InrPipe } from '../../shared/pipes/format.pipes';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, SnackbarComponent, InrPipe],
  template: `
    <div class="public-shell min-h-screen flex flex-col bg-bg-primary">
      <nav class="global-nav" aria-label="Site">
        <div class="global-nav-inner">
          <a routerLink="/" class="public-brand no-underline" aria-label="CloudX Gaming home">
            <span class="public-brand-mark">CX</span>
            <span class="public-brand-text">CloudX</span>
          </a>

          <button type="button" class="location-bar hidden sm:flex" aria-label="Venue location">
            <app-icon name="location_on" size="sm" class="text-accent shrink-0" />
            <span class="location-bar-text">
              <span class="location-bar-label">CloudX Gaming</span>
              <span class="location-bar-address">Sholinganallur, Chennai</span>
            </span>
            <app-icon name="expand_more" size="sm" class="text-text-muted shrink-0" />
          </button>

          <div class="flex items-center gap-2">
            <a routerLink="/book" class="public-nav-cart hidden sm:inline-flex" aria-label="View booking cart">
              <app-icon name="shopping_bag" size="sm" />
              @if (cart.snackCount() > 0) {
                <span class="public-nav-cart-badge">{{ cart.snackCount() }}</span>
              }
            </a>
            <a routerLink="/book" class="btn-primary !min-h-[36px] !py-2 !px-4 !text-xs hidden sm:inline-flex">
              Book now
            </a>
          </div>
        </div>
      </nav>

      <main class="public-main flex-1">
        <router-outlet />
      </main>

      @if (showFloatingCart()) {
        <a routerLink="/book" class="floating-cart-bar">
          <span class="floating-cart-count">{{ cart.snackCount() }} item{{ cart.snackCount() === 1 ? '' : 's' }}</span>
          <span class="floating-cart-cta">
            View cart · {{ cart.snackTotal() | inr }}
            <app-icon name="chevron_right" size="sm" />
          </span>
        </a>
      }

      <nav class="public-bottom-nav sm:hidden" aria-label="Main">
        <div class="public-bottom-nav-inner">
          @for (item of navItems; track item.path; let i = $index) {
            <a
              [routerLink]="item.path"
              [fragment]="item.fragment"
              class="public-bottom-nav-link"
              [class.public-bottom-nav-link--active]="activeIndex() === i"
              [attr.aria-current]="activeIndex() === i ? 'page' : null"
            >
              <span class="public-bottom-nav-icon">
                <app-icon [name]="item.icon" size="md" [filled]="activeIndex() === i" />
                @if (item.showBadge && cart.snackCount() > 0) {
                  <span class="public-bottom-nav-badge">{{ cart.snackCount() > 9 ? '9+' : cart.snackCount() }}</span>
                }
              </span>
              <span class="public-bottom-nav-label">{{ item.label }}</span>
            </a>
          }
        </div>
      </nav>

      <app-snackbar />
    </div>
  `,
})
export class PublicLayoutComponent {
  private router = inject(Router);
  cart = inject(PublicCartService);

  activeIndex = computed(() => this.resolveActiveIndex(this.currentUrl()));

  private currentUrl = signal('');

  navItems = [
    { path: '/', label: 'Home', icon: 'home', exact: true, showBadge: false },
    { path: '/', label: 'Menu', icon: 'restaurant', exact: false, fragment: 'menu', showBadge: false },
    { path: '/book', label: 'Book', icon: 'event_available', exact: false, showBadge: true },
    { path: '/admin/login', label: 'Staff', icon: 'badge', exact: false, showBadge: false },
  ];

  showFloatingCart = computed(() => {
    const path = this.currentUrl().split('#')[0];
    return this.cart.snackCount() > 0 && !path.startsWith('/book');
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects),
        startWith(this.router.url),
        takeUntilDestroyed(),
      )
      .subscribe((url) => {
        const path = url.split('?')[0];
        const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
        this.currentUrl.set(path + hash);
      });
  }

  private resolveActiveIndex(url: string): number {
    if (url.split('#')[0].startsWith('/book')) return 2;
    if (url.includes('/admin/login')) return 3;
    if (url.includes('#menu')) return 1;
    const path = url.split('#')[0];
    if (path === '/' || path === '') return 0;
    return 0;
  }
}
