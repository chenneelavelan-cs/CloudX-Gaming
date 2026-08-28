import { Directive, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { forceReflow } from './transition-tokens';

/** Swaps text in `.t-text-swap` with blurred up/down transition. */
@Directive({
  selector: '[tTextSwap]',
  standalone: true,
})
export class TextSwapDirective implements OnChanges {
  private el = inject(ElementRef<HTMLElement>);

  @Input() tTextSwap = '';

  ngOnChanges(changes: SimpleChanges): void {
    if ('tTextSwap' in changes && !changes['tTextSwap'].firstChange) {
      const node = this.el.nativeElement;
      node.classList.remove('is-swap');
      forceReflow(node);
      node.textContent = this.tTextSwap;
      node.classList.add('is-swap');
    }
  }
}
