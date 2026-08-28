import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../core/services/snackbar.service';
import { IconComponent } from './icon.component';
import { OpenCloseDirective } from '../transitions/open-close.directive';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule, IconComponent, OpenCloseDirective],
  template: `
    @if (snackbar.message(); as msg) {
      <div class="snackbar-host">
        <div
          class="snackbar t-toast"
          [class]="'snackbar snackbar-' + msg.type + ' t-toast'"
          [class.is-open]="toastOpen()"
          [tOpenClose]="toastOpen()"
          [tOpenCloseDur]="'--toast-close'"
          role="status"
        >
          <app-icon [name]="iconFor(msg.type)" size="sm" />
          <span class="snackbar-text">{{ msg.text }}</span>
          <button type="button" class="snackbar-close" (click)="snackbar.dismiss()" aria-label="Dismiss">
            <app-icon name="close" size="sm" />
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .snackbar-host {
        @apply fixed bottom-20 md:bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none;
      }
      .snackbar {
        @apply pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg max-w-md w-full text-sm;
      }
      .snackbar-text {
        @apply flex-1 leading-snug;
      }
      .snackbar-close {
        @apply text-text-muted hover:text-text-primary p-1 shrink-0;
      }
      .snackbar-success {
        @apply bg-emerald-950/95 border-emerald-500/40 text-emerald-100;
      }
      .snackbar-warning {
        @apply bg-amber-950/95 border-amber-500/40 text-amber-100;
      }
      .snackbar-error {
        @apply bg-red-950/95 border-red-500/40 text-red-100;
      }
    `,
  ],
})
export class SnackbarComponent {
  snackbar = inject(SnackbarService);
  toastOpen = signal(false);

  constructor() {
    effect(() => {
      const msg = this.snackbar.message();
      if (msg) {
        queueMicrotask(() => this.toastOpen.set(true));
      } else {
        this.toastOpen.set(false);
      }
    });
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
