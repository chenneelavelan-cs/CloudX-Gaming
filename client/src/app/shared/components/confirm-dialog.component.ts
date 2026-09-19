import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (dialog.state(); as s) {
      <div class="confirm-dialog-backdrop" (click)="dialog.dismiss()" role="presentation">
        <div
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="'confirm-title'"
          (click)="$event.stopPropagation()"
        >
          <div class="confirm-dialog-icon" [class.confirm-dialog-icon--danger]="s.danger">
            <app-icon [name]="s.danger ? 'warning' : 'help_outline'" size="md" />
          </div>
          <h2 id="confirm-title" class="confirm-dialog-title">{{ s.title }}</h2>
          <p class="confirm-dialog-message">{{ s.message }}</p>
          <div class="confirm-dialog-actions">
            <button type="button" class="btn-secondary confirm-dialog-btn" (click)="dialog.dismiss()">
              {{ s.cancelLabel }}
            </button>
            <button
              type="button"
              [class]="s.danger ? 'btn-danger-soft confirm-dialog-btn' : 'btn-primary confirm-dialog-btn'"
              (click)="dialog.accept()"
            >
              {{ s.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  dialog = inject(ConfirmDialogService);
}
