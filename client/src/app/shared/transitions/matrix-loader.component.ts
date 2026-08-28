import { Component, Input, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { transitionMs } from './transition-tokens';

const CORNERS = [0, 3, 12, 15];
const RING = [1, 2, 7, 11, 14, 13, 8, 4];
const INNER = [5, 6, 9, 10];
const TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];

@Component({
  selector: 'app-matrix-loader',
  standalone: true,
  template: `<div #loader class="t-matrix" [attr.data-variant]="variant" [attr.data-rounded]="rounded"></div>`,
  styles: [`:host { display: inline-block; }`],
})
export class MatrixLoaderComponent implements AfterViewInit {
  @Input() variant: 'scan' | 'twinkle' | 'orbit' | 'pulse' = 'scan';
  @Input() rounded = true;
  @ViewChild('loader') loaderRef?: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    const loader = this.loaderRef?.nativeElement;
    if (!loader) return;
    const cycle = transitionMs('--matrix-cycle', 1200);
    for (let idx = 0; idx < 16; idx++) {
      const dot = document.createElement('i');
      const col = idx % 4;
      if (this.rounded && CORNERS.includes(idx)) {
        dot.className = 'is-gap';
      } else if (this.variant === 'scan') {
        dot.style.setProperty('--d', String(Math.round(col * (cycle / 10))));
      } else if (this.variant === 'twinkle') {
        dot.style.setProperty('--d', String(Math.round(TWINKLE[idx]! * (cycle / 16))));
      } else if (this.variant === 'orbit') {
        const k = RING.indexOf(idx);
        if (k !== -1) {
          dot.style.setProperty('--d', String(Math.round(k * (cycle / 8))));
        } else {
          dot.style.animation = 'none';
        }
      } else if (this.variant === 'pulse') {
        const ring = INNER.includes(idx) ? 0 : 1;
        dot.style.setProperty('--d', String(Math.round(ring * (cycle * 0.16))));
      }
      loader.appendChild(dot);
    }
  }
}
