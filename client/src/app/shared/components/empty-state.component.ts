import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterModule, IconComponent],
  template: `
    <div class="empty-state">
      @if (icon) {
        <div class="empty-state-icon-wrap">
          <app-icon [name]="icon" size="xl" />
        </div>
      }
      @if (imageSrc) {
        <img [src]="imageSrc" [alt]="title" class="empty-state-image" loading="lazy" />
      }
      <p class="empty-state-title">{{ title }}</p>
      @if (description) {
        <p class="empty-state-desc">{{ description }}</p>
      }
      @if (actionLabel && actionLink) {
        <a [routerLink]="actionLink" class="btn-primary inline-flex mt-4 text-sm py-2.5 px-5 min-h-0">
          @if (actionIcon) {
            <app-icon [name]="actionIcon" size="sm" />
          }
          {{ actionLabel }}
        </a>
      } @else if (actionLabel) {
        <ng-content select="[emptyAction]" />
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() description?: string;
  @Input() icon?: string;
  @Input() imageSrc?: string;
  @Input() actionLabel?: string;
  @Input() actionLink?: string | string[];
  @Input() actionIcon?: string;
}
