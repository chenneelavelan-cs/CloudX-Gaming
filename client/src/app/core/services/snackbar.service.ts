import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'warning' | 'error';

export interface SnackbarMessage {
  text: string;
  type: SnackbarType;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly message = signal<SnackbarMessage | null>(null);
  private hideTimer?: ReturnType<typeof setTimeout>;

  show(text: string, type: SnackbarType = 'success', durationMs = 3500) {
    this.message.set({ text, type });
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.dismiss(), durationMs);
  }

  success(text: string) {
    this.show(text, 'success');
  }

  warning(text: string) {
    this.show(text, 'warning', 4000);
  }

  error(text: string) {
    this.show(text, 'error', 4500);
  }

  dismiss() {
    this.message.set(null);
  }
}
