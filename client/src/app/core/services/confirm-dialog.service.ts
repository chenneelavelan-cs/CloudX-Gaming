import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmResolver = (confirmed: boolean) => void;

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  state = signal<ConfirmDialogState | null>(null);

  private resolver: ConfirmResolver | null = null;

  confirm(options: ConfirmDialogState): Promise<boolean> {
    if (this.state()) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.state.set({
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        ...options,
      });
    });
  }

  accept() {
    this.finish(true);
  }

  dismiss() {
    this.finish(false);
  }

  private finish(confirmed: boolean) {
    this.state.set(null);
    this.resolver?.(confirmed);
    this.resolver = null;
  }
}
