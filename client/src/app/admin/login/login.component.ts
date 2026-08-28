import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon.component';
import { TextsRevealDirective } from '../../shared/transitions/texts-reveal.directive';
import { TextSwapDirective } from '../../shared/transitions/text-swap.directive';
import { CardTiltDirective } from '../../shared/transitions/card-tilt.directive';
import { shakeField } from '../../shared/transitions/error-shake.util';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TextsRevealDirective, TextSwapDirective, CardTiltDirective],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div class="card w-full max-w-md t-tilt overflow-hidden">
        <div class="t-tilt-card">
        <div class="text-center mb-8 t-stagger" tTextsReveal>
          <h1 class="text-2xl font-medium text-text-primary t-stagger-line">CloudX Gaming</h1>
          <p class="text-text-secondary mt-1 text-sm t-stagger-line t-stagger-line--2">Admin Login</p>
        </div>

        @if (error()) {
          <div class="rounded-lg border border-status-danger/30 bg-status-danger/10 text-status-danger px-3 py-2.5 text-sm mb-4 t-toast is-open">
            {{ error() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="t-input-wrap">
            <label class="label" for="email">Email</label>
            <input id="email" type="email" class="input t-input" [(ngModel)]="email" name="email" required autocomplete="email" />
          </div>
          <div class="t-input-wrap">
            <label class="label" for="password">Password</label>
            <input id="password" type="password" class="input t-input" [(ngModel)]="password" name="password" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            <app-icon name="login" size="sm" />
            <span class="t-text-swap" [tTextSwap]="loading() ? 'Signing in...' : 'Sign In'">{{ loading() ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>
        <span class="t-tilt-glare" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = 'admin@cloudxgaming.com';
  password = '';
  loading = signal(false);
  error = signal('');

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Login failed');
        shakeField('email');
        shakeField('password');
      },
    });
  }
}
