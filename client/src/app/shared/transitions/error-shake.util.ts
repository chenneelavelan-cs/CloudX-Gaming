import { transitionMs } from './transition-tokens';
import { forceReflow } from './transition-tokens';

/**
 * Trigger transitions-dev error shake on a field by id.
 * Expects the element (or its parent) to use `.t-input-wrap` / `.t-input` structure,
 * or falls back to wrapping behavior on the element itself.
 */
export function shakeField(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const wrap = el.closest('.t-input-wrap') as HTMLElement | null;
  const input = (wrap?.querySelector('.t-input') as HTMLElement | null) ?? el;

  if (!wrap) {
    el.classList.add('t-input', 'is-error', 'is-shaking');
    replayShake(el);
    return;
  }

  wrap.classList.add('is-error');
  input.classList.add('is-error');
  replayShake(input);

  const shakeMs =
    transitionMs('--shake-dur-a', 80) * 2 + transitionMs('--shake-dur-b', 60) * 2;
  const hold = transitionMs('--revert-hold', 3000);

  const prev = (wrap as HTMLElement & { _revertTimer?: ReturnType<typeof setTimeout> })._revertTimer;
  if (prev) clearTimeout(prev);

  (wrap as HTMLElement & { _revertTimer?: ReturnType<typeof setTimeout> })._revertTimer = setTimeout(() => {
    wrap.classList.remove('is-error');
    input.classList.remove('is-error');
  }, shakeMs + hold);
}

function replayShake(input: HTMLElement): void {
  input.classList.remove('is-shaking');
  forceReflow(input);
  input.classList.add('is-shaking');
  const shakeMs =
    transitionMs('--shake-dur-a', 80) * 2 + transitionMs('--shake-dur-b', 60) * 2;
  setTimeout(() => input.classList.remove('is-shaking'), shakeMs + 20);
}
