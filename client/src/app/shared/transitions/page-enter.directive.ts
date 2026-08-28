import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { forceReflow } from './transition-tokens';

/** Fade + slide in the host on first paint (use on page root wrappers). */
@Directive({
  selector: '[tPageEnter]',
  standalone: true,
})
export class PageEnterDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('t-page-enter');
    forceReflow(node);
    requestAnimationFrame(() => node.classList.add('is-shown'));
  }
}
