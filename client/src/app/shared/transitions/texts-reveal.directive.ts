import { Directive, ElementRef, AfterViewInit, inject } from '@angular/core';
import { forceReflow } from './transition-tokens';

/** Adds `.is-shown` to `.t-stagger` blocks on mount for staggered text reveal. */
@Directive({
  selector: '[tTextsReveal]',
  standalone: true,
})
export class TextsRevealDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    node.classList.remove('is-hiding', 'is-shown');
    forceReflow(node);
    requestAnimationFrame(() => node.classList.add('is-shown'));
  }
}
