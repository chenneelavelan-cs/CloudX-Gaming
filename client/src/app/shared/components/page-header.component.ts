import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icon.component';
import { TextsRevealDirective } from '../transitions/texts-reveal.directive';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterModule, IconComponent, TextsRevealDirective],
  template: `
    <header class="page-header">
      <a [routerLink]="backLink" class="page-back" [attr.aria-label]="backLabel">
        <app-icon name="arrow_back" size="sm" />
      </a>
      <div class="page-title-block t-stagger" tTextsReveal>
        <h1 class="page-title t-stagger-line">{{ title }}</h1>
        @if (subtitle) {
          <p class="page-subtitle t-stagger-line t-stagger-line--2">{{ subtitle }}</p>
        }
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input({ required: true }) backLink = '/admin/dashboard';
  @Input() backLabel = 'Go back';
}
