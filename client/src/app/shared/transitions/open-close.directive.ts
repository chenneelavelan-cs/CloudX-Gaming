import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { transitionMs } from './transition-tokens';

/** Drives `.is-open` / `.is-closing` for t-dropdown, t-modal, t-toast, t-panel, etc. */
@Directive({
  selector: '[tOpenClose]',
  standalone: true,
})
export class OpenCloseDirective implements OnChanges, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private timer?: ReturnType<typeof setTimeout>;
  private closeVar = '--dropdown-close-dur';

  @Input('tOpenClose') open = false;
  /** CSS variable name for close duration (e.g. `--modal-close-dur`). */
  @Input() tOpenCloseDur = '--dropdown-close-dur';

  ngOnChanges(changes: SimpleChanges): void {
    if ('tOpenCloseDur' in changes) {
      this.closeVar = this.tOpenCloseDur;
    }
    if ('tOpenClose' in changes) {
      this.apply(this.open);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private apply(open: boolean): void {
    const node = this.el.nativeElement;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (open) {
      node.classList.remove('is-closing');
      node.classList.add('is-open');
      return;
    }
    if (!node.classList.contains('is-open') && !node.classList.contains('is-closing')) {
      return;
    }
    node.classList.remove('is-open');
    node.classList.add('is-closing');
    const closeMs = transitionMs(this.closeVar, 150);
    this.timer = setTimeout(() => {
      node.classList.remove('is-closing');
      this.timer = undefined;
    }, closeMs);
  }
}
