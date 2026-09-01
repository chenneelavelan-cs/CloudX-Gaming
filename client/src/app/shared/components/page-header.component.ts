import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterModule, IconComponent],
  template: `
    <div class="page-back-bar">
      <a [routerLink]="backLink" class="page-back" [attr.aria-label]="backLabel">
        <app-icon name="arrow_back" size="sm" />
      </a>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) backLink = '/admin/dashboard';
  @Input() backLabel = 'Go back';
}
