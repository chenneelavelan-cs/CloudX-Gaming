import { SnackbarService } from '../../core/services/snackbar.service';
import { shakeField } from '../transitions/error-shake.util';

export interface FormFieldRule {
  id: string;
  label: string;
  valid: () => boolean;
}

export function validateRequiredFields(fields: FormFieldRule[], snackbar: SnackbarService): boolean {
  const missing = fields.filter((f) => !f.valid());
  if (missing.length === 0) return true;

  const labels = missing.map((f) => f.label);
  const message =
    labels.length === 1 ? `Please fill in ${labels[0]}` : `Please fill in: ${labels.join(', ')}`;
  snackbar.warning(message);

  for (const field of missing) {
    highlightField(field.id);
  }

  return false;
}

export function highlightField(id: string, durationMs = 2000) {
  shakeField(id);
  // Legacy pulse fallback for fields without t-input-wrap structure
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.closest('.t-input-wrap')) {
    el.classList.add('field-error-flash');
    window.setTimeout(() => el.classList.remove('field-error-flash'), durationMs);
  }
}
