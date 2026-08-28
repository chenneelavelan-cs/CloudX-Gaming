import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);

  @Input() disabled = false;
  @Output() loadMore = new EventEmitter<void>();

  private observer?: IntersectionObserver;

  ngOnInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !this.disabled) {
          this.loadMore.emit();
        }
      },
      { rootMargin: '200px' }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
