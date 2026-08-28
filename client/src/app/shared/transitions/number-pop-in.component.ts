import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, inject } from '@angular/core';
import { forceReflow } from './transition-tokens';

@Component({
  selector: 'app-number-pop-in',
  standalone: true,
  template: `
    <span #group class="t-digit-group" [class.is-animating]="animating">
      @for (d of digits; track $index) {
        <span class="t-digit" [attr.data-stagger]="d.stagger">{{ d.char }}</span>
      }
    </span>
  `,
})
export class NumberPopInComponent implements OnChanges {
  @Input() value: string | number = '';
  @ViewChild('group') groupRef?: ElementRef<HTMLElement>;

  digits: { char: string; stagger?: string }[] = [];
  animating = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) {
      this.renderDigits(String(this.value ?? ''));
    }
  }

  private renderDigits(str: string): void {
    this.animating = false;
    const chars = str.split('');
    this.digits = chars.map((ch, i) => ({
      char: ch,
      stagger: i === chars.length - 2 ? '1' : i === chars.length - 1 ? '2' : undefined,
    }));
    queueMicrotask(() => {
      const el = this.groupRef?.nativeElement;
      if (!el) return;
      forceReflow(el);
      this.animating = true;
    });
  }
}
