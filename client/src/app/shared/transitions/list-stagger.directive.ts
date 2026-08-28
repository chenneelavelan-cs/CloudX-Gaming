import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { forceReflow } from './transition-tokens';

/** Stagger-reveals `.t-list-item` children when the list mounts. */
@Directive({
  selector: '.t-list-stagger',
  standalone: true,
})
export class ListStaggerDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    this.reveal();
  }

  private reveal(): void {
    const node = this.el.nativeElement;
    node.classList.remove('is-shown');
    forceReflow(node);
    requestAnimationFrame(() => node.classList.add('is-shown'));
  }
}
