import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-media-image',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="media-image"
      [class.media-image--rounded]="rounded"
      [class.media-image--wide]="aspect === 'wide'"
      [class.media-image--square]="aspect === 'square'"
      [class.media-image--tall]="aspect === 'tall'"
    >
      @if (!failed()) {
        <img
          [src]="src"
          [alt]="alt"
          loading="lazy"
          decoding="async"
          (error)="onError()"
          class="media-image-img"
        />
      }
      @if (failed()) {
        <div class="media-image-fallback" [class]="fallbackClass">
          @if (fallbackIcon) {
            <app-icon [name]="fallbackIcon" [size]="fallbackIconSize" />
          }
        </div>
      }
    </div>
  `,
})
export class MediaImageComponent {
  @Input({ required: true }) src = '';
  @Input({ required: true }) alt = '';
  @Input() fallbackIcon = 'image';
  @Input() fallbackIconSize: 'sm' | 'md' | 'lg' | 'xl' = 'lg';
  @Input() aspect: 'wide' | 'square' | 'tall' = 'wide';
  @Input() rounded = true;
  @Input() fallbackClass = 'media-image-fallback--gaming';

  failed = signal(false);

  onError() {
    this.failed.set(true);
  }
}
