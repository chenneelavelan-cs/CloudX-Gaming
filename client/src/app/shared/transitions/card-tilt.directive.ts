import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

const MAX_TILT = 14;

/** 3D card tilt + glare on `.t-tilt` wrappers. */
@Directive({
  selector: '.t-tilt',
  standalone: true,
})
export class CardTiltDirective implements OnInit, OnDestroy {
  private tilt = inject(ElementRef<HTMLElement>);
  private card?: HTMLElement;
  private reduce = matchMedia('(prefers-reduced-motion: reduce)');
  private bound = {
    down: this.onDown.bind(this),
    move: this.onMove.bind(this),
    up: this.onUp.bind(this),
    cancel: this.onUp.bind(this),
    leave: this.onLeave.bind(this),
  };

  ngOnInit(): void {
    const host = this.tilt.nativeElement;
    this.card = host.querySelector('.t-tilt-card') ?? undefined;
    host.addEventListener('pointerdown', this.bound.down);
    host.addEventListener('pointermove', this.bound.move);
    host.addEventListener('pointerup', this.bound.up);
    host.addEventListener('pointercancel', this.bound.cancel);
    host.addEventListener('pointerleave', this.bound.leave);
  }

  ngOnDestroy(): void {
    const host = this.tilt.nativeElement;
    host.removeEventListener('pointerdown', this.bound.down);
    host.removeEventListener('pointermove', this.bound.move);
    host.removeEventListener('pointerup', this.bound.up);
    host.removeEventListener('pointercancel', this.bound.cancel);
    host.removeEventListener('pointerleave', this.bound.leave);
  }

  private onDown(e: PointerEvent): void {
    if (e.pointerType !== 'mouse') {
      try {
        this.tilt.nativeElement.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  private onMove(e: PointerEvent): void {
    if (this.reduce.matches || !this.card) return;
    const host = this.tilt.nativeElement;
    const r = host.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    host.classList.add('is-hover');
    this.card.classList.add('is-tilting');
    this.card.style.setProperty('--tilt-ry', `${((px - 0.5) * MAX_TILT).toFixed(2)}deg`);
    this.card.style.setProperty('--tilt-rx', `${((0.5 - py) * MAX_TILT).toFixed(2)}deg`);
    this.card.style.setProperty('--tilt-gx', `${(px * 100).toFixed(1)}%`);
    this.card.style.setProperty('--tilt-gy', `${(py * 100).toFixed(1)}%`);
    host.style.setProperty('--tilt-gx', `${(px * 100).toFixed(1)}%`);
    host.style.setProperty('--tilt-gy', `${(py * 100).toFixed(1)}%`);
  }

  private onUp(): void {
    this.reset();
  }

  private onLeave(e: PointerEvent): void {
    if (e.pointerType === 'mouse') this.reset();
  }

  private reset(): void {
    const host = this.tilt.nativeElement;
    host.classList.remove('is-hover');
    this.card?.classList.remove('is-tilting');
    this.card?.style.setProperty('--tilt-rx', '0deg');
    this.card?.style.setProperty('--tilt-ry', '0deg');
  }
}
