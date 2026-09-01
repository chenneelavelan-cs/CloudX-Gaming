import { Injectable, signal } from '@angular/core';

export interface PageActionLink {
  kind: 'link';
  label: string;
  routerLink: string | string[];
  icon?: string;
  primary?: boolean;
  compact?: boolean;
}

export interface PageActionButton {
  kind: 'button';
  label: string;
  icon?: string;
  primary?: boolean;
  id: string;
  danger?: boolean;
  compact?: boolean;
}

export type PageAction = PageActionLink | PageActionButton;

@Injectable({ providedIn: 'root' })
export class PageActionsService {
  private items = signal<PageAction[]>([]);
  private handlers = new Map<string, () => void>();

  readonly actions = this.items.asReadonly();

  set(actions: PageAction[], handlers?: Record<string, () => void>) {
    this.handlers.clear();
    if (handlers) {
      for (const [id, fn] of Object.entries(handlers)) {
        this.handlers.set(id, fn);
      }
    }
    this.items.set(actions);
  }

  run(id: string) {
    this.handlers.get(id)?.();
  }

  clear() {
    this.items.set([]);
    this.handlers.clear();
  }
}
