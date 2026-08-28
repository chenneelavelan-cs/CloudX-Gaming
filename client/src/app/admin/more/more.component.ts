import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../shared/components/icon.component';
import { CardTiltDirective } from '../../shared/transitions/card-tilt.directive';

@Component({
  selector: 'app-more',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, CardTiltDirective],
  template: `
    <h1 class="page-heading">More</h1>
    <div class="space-y-2">
      @for (item of items; track item.path) {
        <a [routerLink]="item.path" class="card flex items-center gap-4 hover:bg-white/[0.06] transition-colors t-tilt">
          <div class="t-tilt-card flex items-center gap-4 w-full">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.04] text-text-secondary">
              <app-icon [name]="item.icon" size="md" />
            </div>
            <div>
              <p class="font-medium">{{ item.label }}</p>
              <p class="text-text-muted text-sm">{{ item.desc }}</p>
            </div>
            <span class="ml-auto text-text-muted t-learn-more">
              <app-icon name="chevron_right" size="sm" />
            </span>
            <span class="t-tilt-glare" aria-hidden="true"></span>
          </div>
        </a>
      }
    </div>
  `,
})
export class MoreComponent {
  items = [
    { path: '/admin/customers', icon: 'groups', label: 'Customers', desc: 'Manage customer records' },
    { path: '/admin/products', icon: 'restaurant', label: 'Products', desc: 'Food & drinks menu' },
    { path: '/admin/gaming/options', icon: 'sports_esports', label: 'Gaming Options', desc: 'Configure gaming types' },
    { path: '/admin/gaming/resources', icon: 'computer', label: 'Resources', desc: 'Physical setups' },
    { path: '/admin/gaming/pricing', icon: 'payments', label: 'Pricing', desc: 'Duration & player pricing' },
    { path: '/admin/reports', icon: 'bar_chart', label: 'Reports', desc: 'Monthly revenue & trends' },
  ];
}
