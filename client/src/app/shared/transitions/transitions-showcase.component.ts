import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatrixLoaderComponent,
  ThinkingStatesComponent,
  TextsRevealDirective,
} from '../../shared/transitions';

@Component({
  selector: 'app-transitions-showcase',
  standalone: true,
  imports: [CommonModule, FormsModule, MatrixLoaderComponent, ThinkingStatesComponent, TextsRevealDirective],
  template: `
    <section class="card mt-6 space-y-4">
      <h2 class="section-heading t-stagger" tTextsReveal>
        <span class="t-stagger-line">Motion library</span>
        <span class="t-stagger-line t-stagger-line--2 block text-text-muted font-normal normal-case tracking-normal text-xs mt-1">
          transitions.dev — all 32 patterns installed
        </span>
      </h2>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-border bg-white/[0.02] p-4">
          <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Matrix loader</p>
          <app-matrix-loader variant="orbit" />
        </div>
        <div class="rounded-xl border border-border bg-white/[0.02] p-4">
          <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Thinking states</p>
          <app-thinking-states [states]="['Syncing sessions', 'Updating dashboard', 'Ready']" />
        </div>
        <div class="rounded-xl border border-border bg-white/[0.02] p-4">
          <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Shimmer text</p>
          <p class="t-shimmer text-sm">Loading report data…</p>
        </div>
        <div class="rounded-xl border border-border bg-white/[0.02] p-4">
          <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Like button</p>
          <button type="button" class="t-like" [class.is-liked]="liked" (click)="liked = !liked" aria-label="Like">
            <svg class="t-like-heart" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
        </div>
        <div class="rounded-xl border border-border bg-white/[0.02] p-4">
          <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Toggle</p>
          <button type="button" class="t-toggle" [attr.data-on]="toggleOn" (click)="toggleOn = !toggleOn" aria-label="Toggle">
            <span class="t-toggle-track"><span class="t-toggle-thumb"></span></span>
          </button>
        </div>
        <div class="rounded-xl border border-border bg-white/[0.02] p-4">
          <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Checkbox</p>
          <label class="t-check inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="sr-only" [(ngModel)]="checked" />
            <span class="t-check-box" [attr.data-checked]="checked">
              <svg viewBox="0 0 16 16" class="t-check-mark" aria-hidden="true">
                <path d="M3 8.5 L6.5 12 L13 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="text-sm">Enable notifications</span>
          </label>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-white/[0.02] p-4">
        <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Streaming text</p>
        <p #streamHost class="text-sm leading-relaxed"></p>
      </div>

      <div class="rounded-xl border border-border bg-white/[0.02] p-4">
        <p class="text-xs text-text-muted mb-2 uppercase tracking-caption">Banner stack</p>
        <div class="t-stack relative min-h-[52px]" #bannerStack (pointerenter)="bannerStack.classList.add('is-spread')" (pointerleave)="bannerStack.classList.remove('is-spread')">
          @for (b of banners; track b; let i = $index) {
            <div class="t-stack-banner rounded-lg border border-border bg-white/[0.06] px-3 py-2 text-sm" [attr.data-depth]="i">
              {{ b }}
            </div>
          }
        </div>
        <button type="button" class="btn-secondary text-xs mt-3 py-2 min-h-0" (click)="pushBanner()">Push banner</button>
      </div>
    </section>
  `,
})
export class TransitionsShowcaseComponent implements AfterViewInit {
  @ViewChild('streamHost') streamHost?: ElementRef<HTMLElement>;

  liked = false;
  toggleOn = false;
  checked = false;
  banners = ['Welcome back', '2 sessions ending soon'];

  ngAfterViewInit(): void {
    this.streamWords('Sessions sync every thirty seconds. Extend or bill from the dashboard.');
  }

  pushBanner(): void {
    const msgs = ['New booking due', 'Payment collected', 'Session extended', 'Report ready'];
    this.banners = [msgs[this.banners.length % msgs.length]!, ...this.banners].slice(0, 3);
  }

  private streamWords(text: string): void {
    const host = this.streamHost?.nativeElement;
    if (!host) return;
    host.replaceChildren();
    const words = text.split(/\s+/);
    words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 't-stream-w';
      span.textContent = w + (i < words.length - 1 ? ' ' : '');
      host.appendChild(span);
      setTimeout(() => span.classList.add('is-in'), i * 60);
    });
  }
}
