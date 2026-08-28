import { Directive, Input, OnChanges, SimpleChanges, ElementRef, inject } from '@angular/core';

/** Toggles `.is-revealed` on `.t-skel` when `[tSkeletonReveal]="loaded"`. */
@Directive({
  selector: '[tSkeletonReveal]',
  standalone: true,
})
export class SkeletonRevealDirective implements OnChanges {
  private el = inject(ElementRef<HTMLElement>);

  @Input() tSkeletonReveal = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('tSkeletonReveal' in changes) {
      const node = this.el.nativeElement;
      if (this.tSkeletonReveal) {
        node.classList.add('is-revealed');
      } else {
        node.classList.add('is-resetting');
        node.classList.remove('is-revealed');
        const skeleton = node.querySelector('.t-skel-skeleton');
        skeleton?.classList.add('is-pulsing');
        void node.offsetWidth;
        node.classList.remove('is-resetting');
      }
    }
  }
}
