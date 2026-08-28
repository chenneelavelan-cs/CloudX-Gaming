import { Component, Input } from '@angular/core';
import { MatrixLoaderComponent } from './matrix-loader.component';
import { ThinkingStatesComponent } from './thinking-states.component';
import { SkeletonRevealDirective } from './skeleton-reveal.directive';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatrixLoaderComponent, ThinkingStatesComponent, SkeletonRevealDirective],
  template: `
    @if (mode === 'skeleton') {
      <div class="t-skel" [tSkeletonReveal]="loaded" [style.min-height.px]="minHeight">
        <div class="t-skel-skeleton is-pulsing">
          <div class="rounded-lg bg-white/[0.06] h-full w-full"></div>
        </div>
        <div class="t-skel-content">
          <ng-content />
        </div>
      </div>
    } @else if (mode === 'matrix') {
      <div class="flex flex-col items-center gap-3 py-6">
        <app-matrix-loader [variant]="matrixVariant" />
        @if (label) {
          <p class="t-shimmer text-sm">{{ label }}</p>
        }
      </div>
    } @else if (mode === 'thinking') {
      <div class="flex justify-center py-6">
        <app-thinking-states [states]="thinkingStates" />
      </div>
    } @else {
      <p class="t-shimmer text-sm text-center py-6">{{ label || 'Loading…' }}</p>
    }
  `,
})
export class LoadingStateComponent {
  @Input() mode: 'shimmer' | 'matrix' | 'thinking' | 'skeleton' = 'shimmer';
  @Input() label = '';
  @Input() loaded = false;
  @Input() minHeight = 120;
  @Input() matrixVariant: 'scan' | 'twinkle' | 'orbit' | 'pulse' = 'scan';
  @Input() thinkingStates: string[] = ['Loading', 'Fetching data', 'Almost there'];
}
