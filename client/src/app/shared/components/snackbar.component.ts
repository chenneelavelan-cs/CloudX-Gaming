import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarMessage, SnackbarService } from '../../core/services/snackbar.service';
import { IconComponent } from './icon.component';
import { OpenCloseDirective } from '../transitions/open-close.directive';
import { transitionMs } from '../transitions/transition-tokens';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule, IconComponent, OpenCloseDirective],
  template: `
    @if (visibleMessage(); as msg) {
      <div class="snackbar-host">
        <div
          [class]="'snackbar snackbar-' + msg.type + ' t-toast'"
          [class.is-open]="toastOpen()"
          [tOpenClose]="toastOpen()"
          tOpenCloseDur="--toast-close"
          role="status"
          aria-live="polite"
        >
          <div class="snackbar-icon">
            <app-icon [name]="iconFor(msg.type)" size="sm" />
          </div>

          <span class="snackbar-text">{{ msg.text }}</span>

          <button type="button" class="snackbar-close" (click)="dismiss()" aria-label="Dismiss">
            <app-icon name="close" size="sm" />
          </button>

          <div
            class="snackbar-progress"
            [style.animation-duration.ms]="msg.durationMs"
            aria-hidden="true"
          ></div>
        </div>
      </div>
    }
  `,
})
export class SnackbarComponent {
  snackbar = inject(SnackbarService);

  visibleMessage = signal<SnackbarMessage | null>(null);
  toastOpen = signal(false);

  private unmountTimer?: ReturnType<typeof setTimeout>;
  private readonly closeMs = transitionMs('--toast-close', 250);

  constructor() {
    effect(() => {
      const msg = this.snackbar.message();
      if (this.unmountTimer) {
        clearTimeout(this.unmountTimer);
        this.unmountTimer = undefined;
      }

      if (msg) {
        this.visibleMessage.set(msg);
        this.toastOpen.set(false);
        queueMicrotask(() => this.toastOpen.set(true));
        return;
      }

      if (this.visibleMessage()) {
        this.toastOpen.set(false);
        this.unmountTimer = setTimeout(() => {
          this.visibleMessage.set(null);
          this.unmountTimer = undefined;
        }, this.closeMs);
      }
    });
  }

  dismiss() {
    this.snackbar.dismiss();
  }

  iconFor(type: string) {
    const map: Record<string, string> = {
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
    };
    return map[type] || 'info';
  }
}
