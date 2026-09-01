import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicService } from '../../core/services/domain.service';
import { GamingOption, Product } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { TextsRevealDirective } from '../../shared/transitions/texts-reveal.directive';
import { CardTiltDirective } from '../../shared/transitions/card-tilt.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, InrPipe, IconComponent, TextsRevealDirective, CardTiltDirective],
  template: `
    <div class="min-h-screen bg-bg-primary">
      <nav class="global-nav" aria-label="Global">
        <div class="global-nav-inner">
          <span class="global-nav-link font-semibold text-text-primary">CloudX</span>
          <div class="hidden sm:flex items-center gap-5">
            <a routerLink="/" class="global-nav-link">Gaming</a>
            <a routerLink="/book" class="global-nav-link">Book</a>
            <a routerLink="/admin/login" class="global-nav-link">Staff</a>
          </div>
          <a routerLink="/book" class="btn-primary !min-h-[36px] !py-2 !px-5 !text-xs hidden sm:inline-flex">
            Book Now
          </a>
        </div>
      </nav>

      <header class="page-section text-center max-w-content mx-auto">
        <div class="t-stagger" tTextsReveal>
          <h1 class="hero-display t-stagger-line">
            <span class="text-accent">CloudX</span> Gaming
          </h1>
          <p class="lead-copy mt-4 t-stagger-line t-stagger-line--2">Premium gaming experience in Sholinganallur</p>
          <div class="flex flex-wrap items-center justify-center gap-3 mt-8 t-stagger-line t-stagger-line--2">
            <a routerLink="/book" class="btn-primary t-learn-more">
              <app-icon name="event_available" size="sm" />
              Book Now
            </a>
            <a routerLink="/admin/login" class="btn-secondary t-learn-more">
              Staff Login
            </a>
          </div>
        </div>
      </header>

      <section class="page-section max-w-grid mx-auto border-t border-border-subtle">
        <h2 class="section-heading mb-6">Gaming Options</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          @for (opt of options(); track opt._id) {
            <div class="card text-center py-6 t-tilt">
              <div class="t-tilt-card">
                <div class="flex justify-center mb-3 text-accent">
                  <app-icon name="sports_esports" size="lg" />
                </div>
                <p class="font-medium">{{ opt.name }}</p>
                @if (opt.description) {
                  <p class="text-text-muted text-sm mt-1">{{ opt.description }}</p>
                }
                <span class="t-tilt-glare" aria-hidden="true"></span>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="page-section max-w-content mx-auto border-t border-border-subtle">
        <h2 class="section-heading mb-6">Snacks &amp; Drinks</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (p of products(); track p._id) {
            <div class="card flex items-center justify-between py-3 t-tilt">
              <div class="t-tilt-card flex items-center justify-between w-full gap-2">
                <span class="flex items-center gap-2 min-w-0">
                  <app-icon name="local_cafe" size="sm" class="text-text-muted shrink-0" />
                  <span class="truncate">{{ p.name }}</span>
                </span>
                <span class="font-medium text-accent shrink-0 tabular-nums">{{ p.price | inr }}</span>
                <span class="t-tilt-glare" aria-hidden="true"></span>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="page-section max-w-content mx-auto text-center border-t border-border-subtle">
        <h2 class="display-lg">Ready to play?</h2>
        <p class="lead-copy mt-3">Book your session in seconds.</p>
        <a routerLink="/book" class="btn-primary inline-flex mt-6">
          <app-icon name="event_available" size="sm" />
          Reserve a Station
        </a>
      </section>

      <footer class="app-footer">
        <p>CloudX Gaming · Sholinganallur</p>
        <a routerLink="/admin/login" class="app-footer-link inline-flex items-center gap-1 justify-center mt-2">
          Staff Login
        </a>
      </footer>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private publicService = inject(PublicService);
  options = signal<GamingOption[]>([]);
  products = signal<Product[]>([]);

  ngOnInit() {
    this.publicService.getOptions().subscribe((o) => this.options.set(o));
    this.publicService.getProducts().subscribe((p) => this.products.set(p));
  }
}
