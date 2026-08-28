/** Read numeric CSS custom properties from :root (transitions-dev tokens). */
export function transitionMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const v = parseFloat(raw);
  return Number.isFinite(v) ? v : fallback;
}

export function forceReflow(el: HTMLElement): void {
  void el.offsetWidth;
}
