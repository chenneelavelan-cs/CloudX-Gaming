import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PageTitleService } from '../../core/services/page-title.service';
import { IconComponent } from '../../shared/components/icon.component';
import { PageEnterDirective, ListStaggerDirective } from '../../shared/transitions';

interface MoreMenuItem {
  path: string;
  icon: string;
  iconKey: string;
  label: string;
  desc: string;
}

interface MoreMenuGroup {
  label: string;
  items: MoreMenuItem[];
}

@Component({
  selector: 'app-more',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, PageEnterDirective, ListStaggerDirective],
  styles: [
    `
      .more-page {
        @apply space-y-5;
      }

      .more-group-label {
        @apply text-[10px] font-semibold uppercase tracking-caption text-text-muted px-1 mb-2;
      }

      .more-menu-card {
        @apply rounded-xl border border-border bg-white/[0.03] overflow-hidden divide-y divide-border-subtle;
      }

      .more-menu-item {
        @apply flex items-center gap-3 px-4 py-3.5 no-underline transition-colors hover:bg-white/[0.04] active:bg-white/[0.06];
        color: inherit;
      }

      .more-menu-item:hover {
        color: inherit;
      }

      .more-menu-icon {
        @apply flex items-center justify-center w-9 h-9 rounded-lg shrink-0;
      }

      .more-menu-icon--people {
        @apply bg-accent/15 text-accent;
      }

      .more-menu-icon--catalog {
        @apply bg-status-info/15 text-status-info;
      }

      .more-menu-icon--gaming {
        @apply bg-status-active/15 text-status-active;
      }

      .more-menu-icon--setup {
        @apply bg-white/[0.06] text-text-secondary;
      }

      .more-menu-icon--pricing {
        @apply bg-accent/10 text-accent;
      }

      .more-menu-icon--reports {
        @apply bg-white/[0.06] text-text-secondary;
      }

      .more-menu-copy {
        @apply flex-1 min-w-0;
      }

      .more-menu-label {
        @apply text-sm font-semibold text-text-primary leading-tight;
      }

      .more-menu-desc {
        @apply text-xs text-text-muted mt-0.5 leading-snug;
      }

      .more-menu-chevron {
        @apply text-text-muted shrink-0 opacity-60;
      }
    `,
  ],
  template: `
    <div class="more-page t-page-enter" tPageEnter>
      <div class="t-list-stagger space-y-5">
        @for (group of groups; track group.label; let gi = $index) {
          <section class="t-list-item" [style.--i]="gi">
            <p class="more-group-label">{{ group.label }}</p>
            <div class="more-menu-card">
              @for (item of group.items; track item.path) {
                <a [routerLink]="item.path" class="more-menu-item">
                  <span [class]="iconClass(item.iconKey)">
                    <app-icon [name]="item.icon" size="sm" />
                  </span>
                  <span class="more-menu-copy">
                    <span class="more-menu-label">{{ item.label }}</span>
                    <span class="more-menu-desc block">{{ item.desc }}</span>
                  </span>
                  <span class="more-menu-chevron" aria-hidden="true">
                    <app-icon name="chevron_right" size="sm" />
                  </span>
                </a>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
})
export class MoreComponent implements OnInit {
  private pageTitleService = inject(PageTitleService);

  groups: MoreMenuGroup[] = [
    {
      label: 'Business',
      items: [
        { path: '/admin/customers', icon: 'groups', iconKey: 'people', label: 'Customers', desc: 'Manage customer records' },
        { path: '/admin/products', icon: 'restaurant', iconKey: 'catalog', label: 'Products', desc: 'Food & drinks menu' },
        { path: '/admin/reports', icon: 'bar_chart', iconKey: 'reports', label: 'Reports', desc: 'Monthly revenue & trends' },
      ],
    },
    {
      label: 'Gaming setup',
      items: [
        { path: '/admin/gaming/options', icon: 'sports_esports', iconKey: 'gaming', label: 'Gaming options', desc: 'Configure gaming types' },
        { path: '/admin/gaming/resources', icon: 'computer', iconKey: 'setup', label: 'Resources', desc: 'PCs, consoles & setups' },
        { path: '/admin/gaming/pricing', icon: 'payments', iconKey: 'pricing', label: 'Pricing', desc: 'Duration & player rates' },
      ],
    },
  ];

  ngOnInit() {
    this.pageTitleService.set({
      title: 'More',
      subtitle: 'Customers, catalog, and gaming setup',
    });
  }

  iconClass(key: string): string {
    const map: Record<string, string> = {
      people: 'more-menu-icon--people',
      catalog: 'more-menu-icon--catalog',
      gaming: 'more-menu-icon--gaming',
      setup: 'more-menu-icon--setup',
      pricing: 'more-menu-icon--pricing',
      reports: 'more-menu-icon--reports',
    };
    return `more-menu-icon ${map[key] || 'more-menu-icon--setup'}`;
  }
}
