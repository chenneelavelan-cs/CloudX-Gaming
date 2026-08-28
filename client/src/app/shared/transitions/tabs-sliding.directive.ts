import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { forceReflow } from './transition-tokens';

/**
 * Sliding pill for `.t-tabs` containers.
 * Set `[tTabsActiveIndex]` to the selected tab index (0-based).
 */
@Directive({
  selector: '[tTabsActiveIndex]',
  standalone: true,
})
export class TabsSlidingDirective implements AfterViewInit, OnChanges, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private pill?: HTMLElement;
  private tabs: HTMLElement[] = [];
  private resizeObserver?: ResizeObserver;
  private raf?: number;

  @Input() tTabsActiveIndex = 0;

  ngAfterViewInit(): void {
    const bar = this.host.nativeElement;
    this.pill = bar.querySelector('.t-tabs-pill') ?? undefined;
    this.tabs = [...bar.querySelectorAll('.t-tab')] as HTMLElement[];
    this.resizeObserver = new ResizeObserver(() => this.moveTo(this.activeTab(), false));
    this.resizeObserver.observe(bar);
    this.raf = requestAnimationFrame(() => this.moveTo(this.activeTab(), false));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('tTabsActiveIndex' in changes && this.tabs.length) {
      this.tabs.forEach((tab, i) => tab.setAttribute('aria-selected', i === this.tTabsActiveIndex ? 'true' : 'false'));
      this.moveTo(this.activeTab(), !changes['tTabsActiveIndex'].firstChange);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  private activeTab(): HTMLElement | undefined {
    return this.tabs[this.tTabsActiveIndex] ?? this.tabs[0];
  }

  private moveTo(tab: HTMLElement | undefined, animate: boolean): void {
    if (!tab || !this.pill) return;
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    const height = tab.offsetHeight;
    const top = tab.offsetTop;
    if (!animate) {
      const prev = this.pill.style.transition;
      this.pill.style.transition = 'none';
      this.pill.style.transform = `translateX(${left}px)`;
      this.pill.style.width = `${width}px`;
      this.pill.style.height = `${height}px`;
      this.pill.style.top = `${top}px`;
      forceReflow(this.pill);
      this.pill.style.transition = prev;
    } else {
      this.pill.style.transform = `translateX(${left}px)`;
      this.pill.style.width = `${width}px`;
      this.pill.style.height = `${height}px`;
      this.pill.style.top = `${top}px`;
    }
  }
}
