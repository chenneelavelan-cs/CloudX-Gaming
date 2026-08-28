import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { transitionMs } from './transition-tokens';
import { forceReflow } from './transition-tokens';

@Component({
  selector: 'app-thinking-states',
  standalone: true,
  template: `
    <span class="t-think">
      <span class="t-think-sizer">{{ widest }}</span>
      <span #live class="t-think-text" [attr.data-text]="current">{{ current }}</span>
    </span>
  `,
})
export class ThinkingStatesComponent implements OnInit, OnDestroy {
  @Input() states: string[] = ['Loading', 'Fetching data', 'Almost there'];
  @Input() holdMs?: number;

  current = '';
  widest = '';
  private timer?: ReturnType<typeof setTimeout>;
  private index = 0;
  private liveEl?: HTMLElement;

  ngOnInit(): void {
    this.widest = [...this.states].sort((a, b) => b.length - a.length)[0] ?? '';
    this.current = this.states[0] ?? '';
    this.timer = setTimeout(() => this.cycle(), this.holdMs ?? transitionMs('--think-hold', 2000));
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private cycle(): void {
    const box = document.querySelector('app-thinking-states .t-think') as HTMLElement | null;
    const live = box?.querySelector('.t-think-text') as HTMLElement | null;
    if (!box || !live) return;

    const swap = transitionMs('--think-swap', 150);
    const gap = transitionMs('--think-gap', 50);
    const hold = this.holdMs ?? transitionMs('--think-hold', 2000);

    live.classList.add('is-exit');
    this.index = (this.index + 1) % this.states.length;
    const nextText = this.states[this.index]!;

    const next = document.createElement('span');
    next.className = 't-think-text is-enter-start';
    next.textContent = nextText;
    next.setAttribute('data-text', nextText);
    box.appendChild(next);
    this.current = nextText;

    const release = () => {
      forceReflow(next);
      next.classList.remove('is-enter-start');
    };
    if (gap > 0) setTimeout(release, gap);
    else release();

    setTimeout(() => live.remove(), swap + gap);
    this.timer = setTimeout(() => this.cycle(), hold);
  }
}
