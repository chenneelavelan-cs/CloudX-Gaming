import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';
import { SnackbarComponent } from '../../shared/components/snackbar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, SnackbarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-bg-primary">
      <header class="admin-header">
        <div class="admin-header-inner">
          <a routerLink="/admin/dashboard" class="admin-brand" aria-label="CloudX Admin dashboard">
            <span class="admin-brand-mark" aria-hidden="true">
              <app-icon name="sports_esports" size="sm" />
            </span>
            <span class="admin-brand-copy">
              <span class="admin-brand-name">CloudX</span>
              <span class="admin-brand-badge">Admin</span>
            </span>
          </a>

          <button type="button" (click)="logout()" class="admin-logout">
            <app-icon name="logout" size="sm" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main class="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-4">
        <div class="max-w-7xl mx-auto p-4 route-outlet-host">
          <router-outlet />
        </div>
      </main>

      <nav class="bottom-nav md:hidden" aria-label="Main navigation">
        <div class="bottom-nav-glow" aria-hidden="true"></div>
        <div class="bottom-nav-inner">
          @for (item of navItems; track item.path; let i = $index) {
            <a
              [routerLink]="item.path"
              [class.bottom-nav-link-active]="activeIndex() === i"
              class="bottom-nav-link"
              [attr.aria-current]="activeIndex() === i ? 'page' : null"
            >
              <span class="bottom-nav-icon">
                <app-icon [name]="item.icon" size="md" [filled]="activeIndex() === i" [swap]="true" />
              </span>
              <span class="bottom-nav-label">{{ item.label }}</span>
            </a>
          }
        </div>
      </nav>

      <aside class="hidden md:block fixed left-0 top-14 bottom-0 w-56 bg-bg-primary border-r border-border-subtle p-4">
        <nav class="space-y-1">
          @for (item of allNavItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="sidebar-link-active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="sidebar-link"
            >
              <app-icon [name]="item.icon" size="sm" />
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>

      <app-snackbar />
    </div>
  `,
  styles: [
    `
      .admin-header {
        @apply sticky top-0 z-40;
        background: rgba(24, 24, 24, 0.94);
        backdrop-filter: blur(16px) saturate(1.2);
        -webkit-backdrop-filter: blur(16px) saturate(1.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .admin-header::after {
        content: '';
        @apply absolute inset-x-0 bottom-0 h-px pointer-events-none;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(218, 41, 28, 0.45) 50%,
          transparent 100%
        );
        opacity: 0.75;
      }

      .admin-header-inner {
        @apply relative flex items-center justify-between max-w-7xl mx-auto px-4 h-14;
      }

      .admin-brand {
        @apply flex items-center gap-2.5 no-underline min-h-[44px];
      }

      .admin-brand-mark {
        @apply flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0;
        background: linear-gradient(180deg, #e23a2c 0%, #c22118 100%);
        box-shadow: 0 0 14px rgba(218, 41, 28, 0.28);
      }

      .admin-brand-copy {
        @apply flex items-center gap-2;
      }

      .admin-brand-name {
        @apply text-[15px] font-bold tracking-tight text-text-primary leading-none;
      }

      .admin-brand-badge {
        @apply inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-semibold uppercase tracking-caption text-text-secondary bg-white/[0.06] border border-border leading-none;
      }

      .admin-logout {
        @apply inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-text-secondary text-[11px] font-semibold uppercase tracking-nav transition-colors min-h-[36px];
      }

      .admin-logout:hover {
        @apply text-text-primary bg-white/[0.05] border-border-medium;
      }

      .admin-logout:active {
        @apply scale-[0.98];
      }

      .route-outlet-host {
        min-height: calc(100vh - 8rem);
      }

      @media (min-width: 768px) {
        main .route-outlet-host {
          margin-left: 14rem;
        }
      }

      .bottom-nav {
        @apply fixed bottom-0 left-0 right-0 z-40;
        padding-bottom: env(safe-area-inset-bottom, 0);
        background: linear-gradient(to top, rgba(24, 24, 24, 0.98) 70%, rgba(24, 24, 24, 0.88));
        backdrop-filter: blur(20px) saturate(1.2);
        -webkit-backdrop-filter: blur(20px) saturate(1.2);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .bottom-nav-glow {
        @apply absolute inset-x-0 top-0 h-px pointer-events-none;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(218, 41, 28, 0.35) 50%,
          transparent 100%
        );
        opacity: 0.6;
      }

      .bottom-nav-inner {
        @apply relative grid grid-cols-5 pt-1.5 pb-2;
      }

      .bottom-nav-link {
        @apply relative flex flex-col items-center justify-center gap-1 py-1 min-h-[3.25rem] text-text-muted no-underline;
        -webkit-tap-highlight-color: transparent;
      }

      .bottom-nav-link::before {
        content: '';
        @apply absolute top-0 left-1/2 rounded-full pointer-events-none;
        width: 18px;
        height: 2.5px;
        background: #da291c;
        transform: translateX(-50%) scaleX(0);
        opacity: 0;
        transition:
          transform 0.22s cubic-bezier(0.32, 0.72, 0, 1),
          opacity 0.18s ease;
      }

      .bottom-nav-icon {
        @apply flex items-center justify-center w-11 h-8;
        transition: color 0.2s ease, transform 0.18s ease;
      }

      .bottom-nav-label {
        @apply text-[9px] font-semibold uppercase tracking-[0.55px] leading-none;
        transition: color 0.2s ease, opacity 0.2s ease;
      }

      .bottom-nav-link-active {
        @apply text-accent;
      }

      .bottom-nav-link-active::before {
        transform: translateX(-50%) scaleX(1);
        opacity: 1;
      }

      .bottom-nav-link-active .bottom-nav-label {
        @apply text-accent;
      }

      .bottom-nav-link:not(.bottom-nav-link-active) .bottom-nav-label {
        @apply opacity-80;
      }

      .bottom-nav-link:active .bottom-nav-icon {
        transform: scale(0.92);
      }

      .sidebar-link {
        @apply flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-white/[0.04] transition-colors uppercase tracking-nav text-sm font-semibold no-underline;
      }

      .sidebar-link-active {
        @apply bg-white/[0.06] text-accent;
      }

      .sidebar-link-active span {
        @apply text-accent;
      }
    `,
  ],
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  activeIndex = signal(0);

  navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/admin/bookings', label: 'Bookings', icon: 'event', exact: false },
    { path: '/admin/gaming', label: 'Gaming', icon: 'sports_esports', exact: false },
    { path: '/admin/bills', label: 'Bills', icon: 'receipt_long', exact: false },
    { path: '/admin/more', label: 'More', icon: 'more_horiz', exact: false },
  ];

  allNavItems = [
    ...this.navItems.slice(0, 4),
    { path: '/admin/customers', label: 'Customers', icon: 'groups', exact: false },
    { path: '/admin/products', label: 'Products', icon: 'restaurant', exact: false },
    { path: '/admin/reports', label: 'Reports', icon: 'bar_chart', exact: false },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.resolveActiveIndex()),
        startWith(this.resolveActiveIndex()),
        takeUntilDestroyed(),
      )
      .subscribe((index) => this.activeIndex.set(index));
  }

  logout() {
    this.auth.logout().subscribe();
  }

  private resolveActiveIndex(): number {
    const url = this.router.url.split('?')[0];
    const index = this.navItems.findIndex((item) =>
      item.exact ? url === item.path : url.startsWith(item.path),
    );
    return index >= 0 ? index : 0;
  }
}
