import { Injectable, signal } from '@angular/core';

export interface PageHeaderMeta {
  title: string;
  subtitle?: string;
  backLink?: string | string[];
  badge?: string | number;
}

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private override = signal<PageHeaderMeta | null>(null);

  readonly meta = this.override.asReadonly();

  set(meta: PageHeaderMeta | null) {
    this.override.set(meta);
  }

  clear() {
    this.override.set(null);
  }
}
