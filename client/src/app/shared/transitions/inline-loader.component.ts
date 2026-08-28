import { Component, Input } from '@angular/core';
import { MatrixLoaderComponent } from './matrix-loader.component';

@Component({
  selector: 'app-inline-loader',
  standalone: true,
  imports: [MatrixLoaderComponent],
  template: `
    <div class="inline-loader" [class.inline-loader-compact]="compact">
      <app-matrix-loader [variant]="variant" [rounded]="rounded" />
      @if (label) {
        <span class="t-shimmer text-sm">{{ label }}</span>
      }
    </div>
  `,
  styles: [
    `
      .inline-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2rem 1rem;
      }
      .inline-loader-compact {
        flex-direction: row;
        padding: 0.75rem 1rem;
        gap: 0.625rem;
      }
    `,
  ],
})
export class InlineLoaderComponent {
  @Input() label = '';
  @Input() compact = false;
  @Input() variant: 'scan' | 'twinkle' | 'orbit' | 'pulse' = 'scan';
  @Input() rounded = true;
}
