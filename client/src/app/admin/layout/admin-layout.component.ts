import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PageActionsService } from '../../core/services/page-actions.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { IconComponent } from '../../shared/components/icon.component';
import { SnackbarComponent } from '../../shared/components/snackbar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, SnackbarComponent, ConfirmDialogComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-bg-primary">
      <nav class="global-nav" aria-label="Global">
        <div class="global-nav-inner">
          <a routerLink="/admin/dashboard" class="global-nav-link font-semibold tracking-tight text-text-primary" aria-label="CloudX Admin">
            CloudX
          </a>
          <div class="hidden md:flex items-center gap-5">
            @for (item of allNavItems; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="!text-white"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                class="global-nav-link"
              >
                {{ item.label }}
              </a>
            }
          </div>
          <button type="button" (click)="logout()" class="btn-utility !min-h-[32px] !py-1.5 !px-3">
            <app-icon name="logout" size="sm" />
            <span class="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <header class="page-top-bar">
        <div class="page-top-bar-inner">
          @if (pageBackLink()) {
            <a [routerLink]="pageBackLink()!" class="page-top-back" aria-label="Go back">
              <app-icon name="arrow_back" size="sm" />
            </a>
          }

          <div class="page-top-copy min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <h1 class="page-top-title">{{ pageTitle() }}</h1>
              @if (pageBadge() != null && pageBadge() !== '') {
                <span class="page-top-badge">{{ pageBadge() }}</span>
              }
            </div>
            @if (pageSubtitle()) {
              <p class="page-top-subtitle">{{ pageSubtitle() }}</p>
            }
          </div>

          @if (pageActions().length) {
            <div class="page-top-actions">
              @for (action of pageActions(); track action.kind === 'link' ? action.label : action.id) {
                @if (action.kind === 'link') {
                  <a
                    [routerLink]="action.routerLink"
                    [class]="action.primary ? 'btn-primary page-top-action-btn' : 'btn-secondary page-top-action-btn'"
                    [attr.aria-label]="action.compact ? action.label : null"
                    [attr.title]="action.compact ? action.label : null"
                  >
                    @if (action.icon) {
                      <app-icon [name]="action.icon" size="sm" />
                    }
                    @if (!action.compact) {
                      <span>{{ action.label }}</span>
                    }
                  </a>
                } @else {
                  <button
                    type="button"
                    [class]="action.primary ? 'btn-primary page-top-action-btn' : action.danger ? 'btn-danger-soft page-top-action-btn' : 'btn-secondary page-top-action-btn'"
                    (click)="runAction(action.id)"
                    [attr.aria-label]="action.compact ? action.label : null"
                    [attr.title]="action.compact ? action.label : null"
                  >
                    @if (action.icon) {
                      <app-icon [name]="action.icon" size="sm" />
                    }
                    @if (!action.compact) {
                      <span>{{ action.label }}</span>
                    }
                  </button>
                }
              }
            </div>
          }
        </div>
      </header>

      <main class="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div class="max-w-grid mx-auto px-4 md:px-6 py-4 route-outlet-host">
          <router-outlet />
        </div>
      </main>

      <nav class="bottom-nav md:hidden" aria-label="Main navigation">
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

      <aside class="hidden md:block fixed left-0 top-[7.25rem] bottom-0 w-56 bg-bg-primary border-r border-border-subtle p-4">
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
      <app-confirm-dialog />
    </div>
  `,
  styles: [
    `
      .route-outlet-host {
        min-height: calc(100vh - 9rem);
      }

      @media (min-width: 768px) {
        main .route-outlet-host {
          margin-left: 14rem;
        }
      }
    `,
  ],
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private pageTitleService = inject(PageTitleService);
  private pageActionsService = inject(PageActionsService);

  activeIndex = signal(0);
  routeTitle = signal('Dashboard');
  routeSubtitle = signal<string | undefined>(undefined);
  routeBackLink = signal<string | string[] | undefined>(undefined);

  pageTitle = computed(() => this.pageTitleService.meta()?.title ?? this.routeTitle());
  pageSubtitle = computed(() => this.pageTitleService.meta()?.subtitle ?? this.routeSubtitle());
  pageBackLink = computed(() => this.pageTitleService.meta()?.backLink ?? this.routeBackLink());
  pageBadge = computed(() => this.pageTitleService.meta()?.badge);
  pageActions = this.pageActionsService.actions;

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
      .subscribe((index) => {
        this.activeIndex.set(index);
        this.routeTitle.set(this.resolveRouteData('title') ?? 'Dashboard');
        this.routeSubtitle.set(this.resolveRouteData('subtitle') as string | undefined);
        this.routeBackLink.set(this.resolveRouteData('backLink') as string | string[] | undefined);
        this.pageTitleService.clear();
        this.pageActionsService.clear();
      });
  }

  runAction(id: string) {
    this.pageActionsService.run(id);
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

  private resolveRouteData(key: string): string | undefined {
    let child = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }
    const value = child?.snapshot.data[key];
    if (value != null) return value as string;
    return undefined;
  }
}
